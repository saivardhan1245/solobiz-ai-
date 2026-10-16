import { GoogleGenAI, Type } from '@google/genai';
import { ModelProvider, AssistantContext } from './provider.js';
import { ExtractionResult, AssistantAnswer, CurrencyCode } from '../types.js';

export class GeminiProvider implements ModelProvider {
  id = 'gemini' as const;
  name = 'Gemini 3.8 Flash (Remote Cloud)';
  type = 'remote' as const;
  description = 'Google Gemini 3.8 Flash cloud inference. Requires internet connection.';
  privacyNotice = 'Remote inference: receipt text and business queries are sent over the internet to Google Cloud servers. If your documents contain strictly confidential business data, choose Local Gemma via Ollama or Deterministic Rule-Based Parser.';

  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    if (!process.env.GEMINI_API_KEY) {
      return {
        ok: false,
        message: 'GEMINI_API_KEY is not configured in environment. Remote inference unavailable.',
        latencyMs: 0,
      };
    }

    try {
      if (!this.ai) {
        this.ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });
      }

      await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'ping',
      });

      return {
        ok: true,
        message: 'Connected to Gemini 3.8 Flash API.',
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        message: `Gemini API check failed: ${msg}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async extractReceipt(ocrText: string, filename?: string): Promise<ExtractionResult> {
    if (!this.ai) {
      throw new Error('Gemini API is not configured. GEMINI_API_KEY is required for remote mode.');
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an accurate financial receipt parser. Extract data from this OCR text:
"""
${ocrText}
"""
Do NOT invent numbers. If missing, use null or 0. Keep arithmetic unadulterated.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING, description: 'YYYY-MM-DD or null' },
            currency: { type: Type.STRING },
            subtotal: { type: Type.NUMBER },
            tax: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
            category: { type: Type.STRING },
            confidenceMerchant: { type: Type.NUMBER },
            confidenceTotal: { type: Type.NUMBER },
          },
          required: ['merchant', 'total'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    const warnings: string[] = [];
    const validationErrors: string[] = [];

    const merchant = parsed.merchant || 'Unknown Merchant';
    let date = parsed.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Date().toISOString().split('T')[0];
      warnings.push('Date could not be confirmed in receipt; defaulted to today.');
    }

    const currency: CurrencyCode = parsed.currency && parsed.currency.length >= 3 ? parsed.currency.toUpperCase() : 'USD';
    const subtotal = typeof parsed.subtotal === 'number' ? parsed.subtotal : null;
    const tax = typeof parsed.tax === 'number' ? parsed.tax : null;
    const total = typeof parsed.total === 'number' ? parsed.total : 0;

    if (total <= 0) {
      validationErrors.push('Receipt total is 0 or unreadable.');
    }

    if (subtotal !== null && tax !== null && total > 0) {
      const calc = Math.round((subtotal + tax) * 100) / 100;
      if (Math.abs(calc - total) > 0.05) {
        warnings.push(`Arithmetic conflict: Subtotal (${subtotal}) + Tax (${tax}) = ${calc}, but Total is ${total}.`);
      }
    }

    return {
      merchant: { value: merchant, confidence: parsed.confidenceMerchant || 0.85 },
      date: { value: date, confidence: 0.85 },
      currency: { value: currency, confidence: 0.9 },
      subtotal: { value: subtotal, confidence: subtotal ? 0.9 : 0.4 },
      tax: { value: tax, confidence: tax ? 0.9 : 0.4 },
      total: { value: total, confidence: parsed.confidenceTotal || 0.85 },
      category: { value: parsed.category || 'General', confidence: 0.85 },
      lineItems: [],
      rawOcrText: ocrText,
      inferenceMode: 'remote',
      modelUsed: 'Gemini 3.8 Flash (Cloud)',
      warnings,
      validationErrors,
    };
  }

  async askAssistant(question: string, context: AssistantContext): Promise<AssistantAnswer> {
    if (!this.ai) {
      throw new Error('Gemini API is not configured.');
    }

    const prompt = `You are a financial assistant for a freelancer.
Answer the question below ONLY using the saved records provided.
Do NOT invent invoices or expenses. If not found, say so.
Return JSON with:
- "answer": human explanation
- "citedExpenseIds": array of cited expense record IDs
- "citedInvoiceIds": array of cited invoice record IDs
- "recordsFound": boolean

Saved Expenses (${context.expenses.length}):
${JSON.stringify(context.expenses, null, 2)}

Saved Invoices (${context.invoices.length}):
${JSON.stringify(context.invoices, null, 2)}

User Question: "${question}"`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            citedExpenseIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            citedInvoiceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            recordsFound: { type: Type.BOOLEAN },
          },
          required: ['answer', 'recordsFound'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      answer: parsed.answer || 'No answer generated.',
      citedExpenseIds: parsed.citedExpenseIds || [],
      citedInvoiceIds: parsed.citedInvoiceIds || [],
      recordsFound: Boolean(parsed.recordsFound),
      inferenceMode: 'remote',
      modelUsed: 'Gemini 3.8 Flash (Cloud)',
    };
  }
}
