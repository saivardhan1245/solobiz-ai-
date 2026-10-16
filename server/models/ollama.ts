import { ModelProvider, AssistantContext } from './provider.js';
import { DeterministicProvider } from './deterministic.js';
import { ExtractionResult, AssistantAnswer, CurrencyCode } from '../types.js';

export class OllamaProvider implements ModelProvider {
  id = 'ollama' as const;
  name = 'Gemma (Local via Ollama)';
  type = 'local' as const;
  description = 'Open-weight Gemma model running completely on your local machine via Ollama. Zero cloud data transmission.';
  privacyNotice = 'Your document text and queries are sent exclusively to your local Ollama port (e.g. http://127.0.0.1:11434). No financial data is sent to external cloud servers.';

  private endpoint: string;
  private model: string;
  private deterministicFallback: DeterministicProvider;

  constructor(endpoint = 'http://127.0.0.1:11434', model = 'gemma2:2b') {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.model = model;
    this.deterministicFallback = new DeterministicProvider();
  }

  setConfiguration(endpoint: string, model: string) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.model = model;
  }

  async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${this.endpoint}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          ok: false,
          message: `Ollama service returned HTTP status ${res.status}. Ensure Ollama is running.`,
          latencyMs,
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = data.models || [];
      const hasModel = models.some(
        (m) => m.name === this.model || m.name.startsWith(this.model.split(':')[0])
      );

      if (!hasModel) {
        const availableList = models.map((m) => m.name).join(', ') || 'none';
        return {
          ok: false,
          message: `Ollama is running, but model '${this.model}' is not pulled yet. Run: \`ollama run ${this.model}\` in your terminal. Available models: ${availableList}`,
          latencyMs,
        };
      }

      return {
        ok: true,
        message: `Connected to Ollama on ${this.endpoint}. Model '${this.model}' is ready for local inference.`,
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        message: `Cannot connect to Ollama at ${this.endpoint}. For local Gemma development, run \`ollama run ${this.model}\` in your terminal. In hosted deployments, SoloBiz AI defaults to the Deterministic Parser. (${errorMsg})`,
        latencyMs,
      };
    }
  }

  async extractReceipt(ocrText: string, filename?: string): Promise<ExtractionResult> {
    const prompt = `You are a financial document parser. Extract structured fields from the raw OCR text below.
STRICT INSTRUCTION: Output ONLY a valid raw JSON object. Do NOT wrap in markdown backticks or commentary.
Do not invent missing numbers. If a field is not present, use null.
Keep arithmetic clean: do not calculate total yourself, extract the numbers found in the text.

Schema to follow:
{
  "merchant": string,
  "date": "YYYY-MM-DD" or null,
  "currency": "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "INR" or string,
  "subtotal": number or null,
  "tax": number or null,
  "total": number,
  "category": "Software & Subscriptions" | "Meals & Entertainment" | "Travel & Transportation" | "Equipment & Hardware" | "Office Supplies" | "General",
  "confidence": {
    "merchant": number (0 to 1),
    "date": number (0 to 1),
    "total": number (0 to 1)
  },
  "lineItems": [
    { "description": string, "amount": number }
  ]
}

Document OCR Text:
"""
${ocrText}
"""`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(
          `Ollama returned HTTP error ${res.status}. Is model '${this.model}' installed? Run \`ollama run ${this.model}\`.`
        );
      }

      const data = (await res.json()) as { response?: string };
      const rawResponse = data.response || '';
      
      // Strict schema parsing & validation
      const cleanedJson = rawResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      return this.validateAndNormalizeResult(parsed, ocrText);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SoloBiz AI] Ollama inference failed (${msg}). Falling back to Deterministic Rule-Based Parser (never cloud AI).`);
      
      const fallbackResult = await this.deterministicFallback.extractReceipt(ocrText, filename);
      fallbackResult.modelUsed = 'Deterministic (Fallback from unreachable Ollama)';
      fallbackResult.inferenceMode = 'deterministic';
      fallbackResult.warnings.unshift(
        `Local Ollama was unreachable at ${this.endpoint}. Document processed locally with Deterministic Rule-Based Parser. Start Ollama with \`ollama run ${this.model}\` for Gemma inference. (Never switched to cloud AI).`
      );
      return fallbackResult;
    }
  }

  private validateAndNormalizeResult(parsed: any, rawOcrText: string): ExtractionResult {
    const warnings: string[] = [];
    const validationErrors: string[] = [];

    // 1. Merchant
    let merchant = typeof parsed.merchant === 'string' && parsed.merchant.trim() ? parsed.merchant.trim() : 'Unknown Merchant';
    let merchantConf = typeof parsed.confidence?.merchant === 'number' ? parsed.confidence.merchant : 0.8;
    if (merchant === 'Unknown Merchant') {
      warnings.push('Merchant name could not be identified by Gemma. Please review and enter merchant.');
    }

    // 2. Date
    let dateVal = parsed.date;
    let dateConf = typeof parsed.confidence?.date === 'number' ? parsed.confidence.date : 0.8;
    if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      dateVal = new Date().toISOString().split('T')[0];
      dateConf = 0.3;
      warnings.push('Date was missing or invalid; filled with current date for manual verification.');
    }

    // 3. Currency
    const currency: CurrencyCode = typeof parsed.currency === 'string' && parsed.currency.length >= 3 ? parsed.currency.toUpperCase() : 'USD';

    // 4. Numbers (Arithmetic logic performed in code, not model)
    const subtotal = typeof parsed.subtotal === 'number' ? parsed.subtotal : null;
    const tax = typeof parsed.tax === 'number' ? parsed.tax : null;
    let total = typeof parsed.total === 'number' ? parsed.total : 0;
    let totalConf = typeof parsed.confidence?.total === 'number' ? parsed.confidence.total : 0.8;

    if (total <= 0) {
      validationErrors.push('Total amount was parsed as 0 or missing. Please verify the amount.');
    }

    // Check arithmetic consistency
    if (subtotal !== null && tax !== null && total > 0) {
      const calculatedTotal = Math.round((subtotal + tax) * 100) / 100;
      if (Math.abs(calculatedTotal - total) > 0.05) {
        warnings.push(`Arithmetic conflict: Model extracted Subtotal (${subtotal}) + Tax (${tax}) = ${calculatedTotal}, which differs from Total (${total}). Please review.`);
      }
    }

    const category = typeof parsed.category === 'string' ? parsed.category : 'General';
    const lineItems = Array.isArray(parsed.lineItems)
      ? parsed.lineItems.map((item: any) => ({
          description: String(item.description || 'Item'),
          amount: typeof item.amount === 'number' ? item.amount : 0,
        }))
      : [];

    return {
      merchant: { value: merchant, confidence: merchantConf, isUncertain: merchantConf < 0.7 },
      date: { value: dateVal, confidence: dateConf, isUncertain: dateConf < 0.7 },
      currency: { value: currency, confidence: 0.9 },
      subtotal: { value: subtotal, confidence: subtotal ? 0.85 : 0.4 },
      tax: { value: tax, confidence: tax ? 0.85 : 0.4 },
      total: { value: total, confidence: totalConf, isUncertain: totalConf < 0.7 },
      category: { value: category, confidence: 0.85 },
      lineItems,
      rawOcrText,
      inferenceMode: 'local',
      modelUsed: `Ollama (${this.model})`,
      warnings,
      validationErrors,
    };
  }

  async askAssistant(question: string, context: AssistantContext): Promise<AssistantAnswer> {
    const expensesSummary = context.expenses.map((e) => ({
      id: e.id,
      merchant: e.merchant,
      date: e.date,
      currency: e.currency,
      total: e.total,
      category: e.category,
      notes: e.notes,
    }));

    const invoicesSummary = context.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      dueDate: inv.dueDate,
      currency: inv.currency,
      total: inv.total,
      status: inv.status,
    }));

    const prompt = `You are an accurate, grounded business assistant for a freelancer.
You must answer the user's question using ONLY the provided saved financial records below.
NEVER make up records, transactions, or invoice statuses.
If the records do not contain the answer, say "I cannot find this in your saved financial records."
Do not present AI-generated arithmetic as authoritative. Explicitly list the IDs of the records you cite.

Format your response strictly as JSON:
{
  "answer": "Clear human explanation grounded only in data",
  "citedExpenseIds": ["id1", "id2"],
  "citedInvoiceIds": ["id3"],
  "recordsFound": boolean
}

Saved Expenses (${expensesSummary.length} records):
${JSON.stringify(expensesSummary, null, 2)}

Saved Invoices (${invoicesSummary.length} records):
${JSON.stringify(invoicesSummary, null, 2)}

User Question: "${question}"`;

    try {
      const res = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}`);
      }

      const data = (await res.json()) as { response?: string };
      const raw = (data.response || '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(raw);
      return {
        answer: parsed.answer || 'No response generated.',
        citedExpenseIds: Array.isArray(parsed.citedExpenseIds) ? parsed.citedExpenseIds : [],
        citedInvoiceIds: Array.isArray(parsed.citedInvoiceIds) ? parsed.citedInvoiceIds : [],
        recordsFound: Boolean(parsed.recordsFound),
        inferenceMode: 'local',
        modelUsed: `Ollama (${this.model})`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SoloBiz AI] Ollama assistant query failed (${msg}). Falling back to Deterministic Record Engine (never cloud AI).`);
      
      const fallbackAnswer = await this.deterministicFallback.askAssistant(question, context);
      return {
        ...fallbackAnswer,
        modelUsed: 'Deterministic Record Engine (Fallback: Ollama offline)',
        inferenceMode: 'deterministic',
        warning: `Local Ollama was unreachable at ${this.endpoint} (${msg}). Computed answer via Deterministic Record Engine. Never sent to cloud AI.`,
      };
    }
  }
}
