import { ModelProvider, AssistantContext } from './provider.js';
import { ExtractionResult, AssistantAnswer, CurrencyCode } from '../types.js';

export class DeterministicProvider implements ModelProvider {
  id = 'deterministic' as const;
  name = 'Offline Processing';
  type = 'deterministic' as const;
  description = '100% offline rule-based parser. Zero network access, zero external LLM dependencies, mathematically deterministic.';
  privacyNotice = 'All processing runs completely in-memory on your local machine. No text or financial data ever leaves your computer.';

  async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    return {
      ok: true,
      message: 'Offline Processing engine is ready (zero network dependencies).',
      latencyMs: Date.now() - start,
    };
  }

  async extractReceipt(ocrText: string, filename?: string): Promise<ExtractionResult> {
    const warnings: string[] = [];
    const validationErrors: string[] = [];

    const lines = ocrText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const MONTH_MAP: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
      july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', apr: '04', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };

    const parseDateStringToIso = (rawDate: string): string | null => {
      if (!rawDate) return null;
      const clean = rawDate.trim();

      // Month DD, YYYY or Month DD YYYY (e.g. January 25, 2016 or Jan 25 2016)
      const monthFirst = clean.match(
        /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i
      );
      if (monthFirst) {
        const m = MONTH_MAP[monthFirst[1].toLowerCase()];
        const d = monthFirst[2].padStart(2, '0');
        const y = monthFirst[3];
        return `${y}-${m}-${d}`;
      }

      // DD Month YYYY (e.g. 25 January 2016)
      const dayFirst = clean.match(
        /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+(\d{4})\b/i
      );
      if (dayFirst) {
        const d = dayFirst[1].padStart(2, '0');
        const m = MONTH_MAP[dayFirst[2].toLowerCase()];
        const y = dayFirst[3];
        return `${y}-${m}-${d}`;
      }

      // YYYY-MM-DD or YYYY/MM/DD
      const isoMatch = clean.match(/\b(20\d\d)[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      }

      // MM/DD/YYYY or DD/MM/YYYY
      const slashMatch = clean.match(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(20\d\d)\b/);
      if (slashMatch) {
        return `${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
      }

      return null;
    };

    // Helper: Extract amount from a single line
    const extractAmountFromLine = (line: string): number | null => {
      const matches = Array.from(
        line.matchAll(/(?:[$€£¥₹]|(?:Rs\.?|INR)\s*)?\s*(\d{1,5}(?:,\d{2,3})*(?:\.\d{2}))\b/gi)
      );
      if (matches.length > 0) {
        const last = matches[matches.length - 1];
        const val = parseFloat(last[1].replace(/,/g, ''));
        if (!isNaN(val) && val >= 0) return val;
      }
      return null;
    };

    // Helper: Identify table column header lines to avoid false positive amounts
    const isTableHeaderRow = (line: string): boolean => {
      const lower = line.toLowerCase();
      const headerWords = ['hrs/qty', 'rate/price', 'adjust', 'service', 'qty', 'description', 'unit price', 'quantity', 'hours'];
      let count = 0;
      for (const w of headerWords) {
        if (lower.includes(w)) count++;
      }
      return count >= 2;
    };

    // 1. Merchant Detection
    let merchant = 'Unknown Merchant';
    let merchantConf = 0.5;

    // Check explicit "From:" or "Billed By:" or "Vendor:" labels
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^(?:from|billed by|vendor|merchant|seller)\s*[:\-]?\s*$/i.test(l) && i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next.length > 1 && !/^(?:to|invoice|date|phone|email)/i.test(next)) {
          merchant = next;
          merchantConf = 0.95;
          break;
        }
      }
      const inlineMatch = l.match(/^(?:from|billed by|vendor|merchant|seller)\s*[:\-]\s*(.+)$/i);
      if (inlineMatch && inlineMatch[1].trim().length > 1) {
        merchant = inlineMatch[1].trim();
        merchantConf = 0.95;
        break;
      }
    }

    // Check for "Thanks for choosing <Vendor>" or similar
    if (merchant === 'Unknown Merchant') {
      const thanksMatch = ocrText.match(/(?:thanks|thank you)\s+for\s+(?:choosing|shopping at|business with)\s+([^|\n\r]+)/i);
      if (thanksMatch && thanksMatch[1].trim().length > 1) {
        merchant = thanksMatch[1].trim();
        merchantConf = 0.92;
      }
    }

    // Fallback: Scan top header lines (excluding disclaimers, payment instructions, addresses, invoice tags)
    if (merchant === 'Unknown Merchant') {
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const candidate = lines[i];
        if (
          candidate.length >= 2 &&
          candidate.length <= 60 &&
          !/^(invoice|receipt|tax invoice|estimate|bill|statement|purchase order|customer copy|original|duplicate|page \d|payment is due|due within|terms|late payment|to:|attn:)/i.test(candidate) &&
          !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(candidate) &&
          !/^(?:suite|p\.?o\.?\s*box|\d+\s+[A-Za-z]+ (?:street|st|ave|avenue|blvd|road|rd|dr|way|lane|ln))/i.test(candidate) &&
          !/\b(20\d\d)\b/.test(candidate) &&
          !/^\d+[\s\-()/]+$/.test(candidate)
        ) {
          merchant = candidate;
          merchantConf = 0.85;
          break;
        }
      }
    }

    if (merchant === 'Unknown Merchant') {
      warnings.push('Merchant name could not be definitively recognized from document header.');
    }

    // 2. Date Detection (NO automatic current-date substitution!)
    let extractedDate = '';
    let dateConf = 0;
    let foundDate = false;

    // First: Look for explicit labeled invoice/bill date (excluding due date)
    for (const line of lines) {
      if (/due\s*date/i.test(line)) continue;
      const dateLabelMatch = line.match(
        /(?:invoice\s*date|date\s*of\s*invoice|issue\s*date|receipt\s*date|transaction\s*date|bill\s*date|^date)\s*[:\t\-]?\s*(.+)/i
      );
      if (dateLabelMatch) {
        const parsed = parseDateStringToIso(dateLabelMatch[1]);
        if (parsed) {
          extractedDate = parsed;
          dateConf = 0.95;
          foundDate = true;
          break;
        }
      }
    }

    // Second: Search document text for any valid date pattern
    if (!foundDate) {
      for (const line of lines) {
        if (/due\s*date/i.test(line)) continue;
        const parsed = parseDateStringToIso(line);
        if (parsed) {
          extractedDate = parsed;
          dateConf = 0.85;
          foundDate = true;
          break;
        }
      }
    }

    if (!foundDate) {
      warnings.push('Date could not be confirmed in document text.');
    }

    // 3. Currency Detection
    let currency: CurrencyCode = 'USD';
    let currencyConf = 0.7;
    if (/[₹]|INR\b|Rs\.?\s*\d|\bRupees?\b/i.test(ocrText)) {
      currency = 'INR';
      currencyConf = 0.95;
    } else if (/[€]|EUR\b/i.test(ocrText)) {
      currency = 'EUR';
      currencyConf = 0.95;
    } else if (/[£]|GBP\b/i.test(ocrText)) {
      currency = 'GBP';
      currencyConf = 0.95;
    } else if (/CAD\b/i.test(ocrText)) {
      currency = 'CAD';
      currencyConf = 0.9;
    } else if (/AUD\b/i.test(ocrText)) {
      currency = 'AUD';
      currencyConf = 0.9;
    } else if (/[$]|USD\b/i.test(ocrText)) {
      currency = 'USD';
      currencyConf = 0.95;
    }

    // 4. Monetary amounts (Subtotal, Tax, Total) — Labeled matching without largest-number fallback
    let subtotal: number | null = null;
    let tax: number | null = null;
    let total: number | null = null;
    let totalConf = 0;

    for (const line of lines) {
      if (isTableHeaderRow(line)) continue;

      // Subtotal line match
      const subMatch = line.match(/(?:sub\s*total|subtotal|net\s+amount|service\s+total)\b/i);
      if (subMatch) {
        const amt = extractAmountFromLine(line);
        if (amt !== null) subtotal = amt;
      }

      // Tax line match
      const taxMatch = line.match(/(?:^|[\s\t])(?:tax|vat|gst|sales\s*tax)\b/i);
      if (taxMatch) {
        const amt = extractAmountFromLine(line);
        if (amt !== null) tax = amt;
      }

      // Total line match
      const totMatch = line.match(/(?:total\s+due|total\s+amount|grand\s+total|amount\s+due|balance\s+due|^total\b)/i);
      if (totMatch) {
        const amt = extractAmountFromLine(line);
        if (amt !== null) {
          total = amt;
          totalConf = 0.92;
        }
      }
    }

    // Invariant validation: check if subtotal + tax roughly equals total
    if (subtotal !== null && tax !== null) {
      const sum = Math.round((subtotal + tax) * 100) / 100;
      if (total !== null) {
        if (Math.abs(sum - total) <= 0.05) {
          totalConf = 0.98;
        } else {
          warnings.push(`Arithmetic conflict: Subtotal (${subtotal}) + Tax (${tax}) = ${sum}, but Total is ${total}. Please verify.`);
        }
      } else {
        // If total was not explicitly labeled, but subtotal + tax exists in text, safely infer
        if (ocrText.includes(sum.toFixed(2))) {
          total = sum;
          totalConf = 0.90;
        }
      }
    }

    // Reject guessing: if no labeled or verified total was found, do NOT pick largest number!
    if (total === null) {
      total = 0;
      totalConf = 0;
      validationErrors.push('Total amount could not be confirmed from document labels or line item arithmetic.');
    }

    // 5. Category inference
    let category = 'General';
    const textLower = ocrText.toLowerCase();
    if (/software|github|aws|cloud|hosting|domain|google|vercel|digitalocean|apple\.com|web design/i.test(textLower)) {
      category = 'Software & Subscriptions';
    } else if (/coffee|restaurant|cafe|bakery|diner|starbucks|food|lunch|dinner/i.test(textLower)) {
      category = 'Meals & Entertainment';
    } else if (/uber|lyft|taxi|transit|flight|airline|train|parking|hotel|airbnb/i.test(textLower)) {
      category = 'Travel & Transportation';
    } else if (/hardware|electronics|monitor|keyboard|laptop|best buy|b&h/i.test(textLower)) {
      category = 'Equipment & Hardware';
    } else if (/office|staples|depot|supplies|paper|printer/i.test(textLower)) {
      category = 'Office Supplies';
    }

    return {
      merchant: { value: merchant, confidence: merchantConf, isUncertain: merchantConf < 0.7 },
      date: { value: extractedDate, confidence: dateConf, isUncertain: !foundDate },
      currency: { value: currency, confidence: currencyConf },
      subtotal: { value: subtotal, confidence: subtotal !== null ? 0.9 : 0.4 },
      tax: { value: tax, confidence: tax !== null ? 0.9 : 0.4 },
      total: { value: total, confidence: totalConf, isUncertain: totalConf < 0.7 },
      category: { value: category, confidence: 0.8 },
      lineItems: [],
      rawOcrText: ocrText,
      inferenceMode: 'deterministic',
      modelUsed: 'Offline Processing Engine',
      warnings,
      validationErrors,
    };
  }

  async askAssistant(question: string, context: AssistantContext): Promise<AssistantAnswer> {
    const q = question.toLowerCase();
    const citedExpenseIds: string[] = [];
    const citedInvoiceIds: string[] = [];

    // Question 1: Unpaid invoices
    if (q.includes('unpaid') || q.includes('outstanding') || (q.includes('invoice') && q.includes('due'))) {
      const unpaid = context.invoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'draft');
      if (unpaid.length === 0) {
        return {
          answer: 'You have no unpaid or outstanding invoices in your records. All active invoices are marked as paid.',
          citedExpenseIds: [],
          citedInvoiceIds: [],
          recordsFound: true,
          inferenceMode: 'deterministic',
          modelUsed: 'Deterministic Record Engine',
        };
      }

      unpaid.forEach((inv) => citedInvoiceIds.push(inv.id));
      const currencyGroups: Record<string, number> = {};
      unpaid.forEach((inv) => {
        currencyGroups[inv.currency] = (currencyGroups[inv.currency] || 0) + inv.total;
      });

      const currencySummaries = Object.entries(currencyGroups)
        .map(([curr, sum]) => `${curr} ${sum.toFixed(2)}`)
        .join(', ');

      const list = unpaid
        .map(
          (inv) =>
            `- Invoice #${inv.invoiceNumber} for ${inv.clientName}: ${inv.currency} ${inv.total.toFixed(2)} (Status: ${inv.status.toUpperCase()}, Due: ${inv.dueDate})`
        )
        .join('\n');

      return {
        answer: `You have ${unpaid.length} unpaid invoice(s) totaling ${currencySummaries}:\n\n${list}`,
        citedExpenseIds: [],
        citedInvoiceIds,
        recordsFound: true,
        inferenceMode: 'deterministic',
        modelUsed: 'Deterministic Record Engine',
      };
    }

    // Question 2: Expenses by category
    if (q.includes('category') || q.includes('breakdown')) {
      if (context.expenses.length === 0) {
        return {
          answer: 'No expenses have been saved to your database yet. Upload and verify receipts or add expenses to see category breakdowns.',
          citedExpenseIds: [],
          citedInvoiceIds: [],
          recordsFound: false,
          inferenceMode: 'deterministic',
          modelUsed: 'Deterministic Record Engine',
        };
      }

      const byCat: Record<string, Record<string, number>> = {};
      context.expenses.forEach((exp) => {
        citedExpenseIds.push(exp.id);
        if (!byCat[exp.category]) byCat[exp.category] = {};
        byCat[exp.category][exp.currency] = (byCat[exp.category][exp.currency] || 0) + exp.total;
      });

      const lines = Object.entries(byCat).map(([cat, currs]) => {
        const amounts = Object.entries(currs)
          .map(([curr, sum]) => `${curr} ${sum.toFixed(2)}`)
          .join(', ');
        return `- ${cat}: ${amounts}`;
      });

      return {
        answer: `Here is your expense breakdown across all verified records by category:\n\n${lines.join('\n')}`,
        citedExpenseIds,
        citedInvoiceIds: [],
        recordsFound: true,
        inferenceMode: 'deterministic',
        modelUsed: 'Deterministic Record Engine',
      };
    }

    // Question 3: Expenses in recent or last month / recent period
    if (q.includes('last month') || q.includes('this month') || q.includes('recent') || q.includes('expense')) {
      if (context.expenses.length === 0) {
        return {
          answer: 'No expense records exist in your database yet.',
          citedExpenseIds: [],
          citedInvoiceIds: [],
          recordsFound: false,
          inferenceMode: 'deterministic',
          modelUsed: 'Deterministic Record Engine',
        };
      }

      // Group by currency to never add different currencies
      const currencyTotals: Record<string, number> = {};
      context.expenses.forEach((exp) => {
        citedExpenseIds.push(exp.id);
        currencyTotals[exp.currency] = (currencyTotals[exp.currency] || 0) + exp.total;
      });

      const totalStr = Object.entries(currencyTotals)
        .map(([c, val]) => `${c} ${val.toFixed(2)}`)
        .join(' and ');

      const topExpenses = context.expenses
        .slice(0, 5)
        .map((e) => `- ${e.date}: ${e.merchant} (${e.category}) — ${e.currency} ${e.total.toFixed(2)}`)
        .join('\n');

      return {
        answer: `Your recorded expenses total ${totalStr} across ${context.expenses.length} record(s).\n\nRecent entries:\n${topExpenses}`,
        citedExpenseIds,
        citedInvoiceIds: [],
        recordsFound: true,
        inferenceMode: 'deterministic',
        modelUsed: 'Deterministic Record Engine',
      };
    }

    // General fallback
    if (context.expenses.length === 0 && context.invoices.length === 0) {
      return {
        answer: 'Your financial database currently contains 0 saved expenses and 0 invoices. Please upload a receipt or create an invoice to ask questions about your financial records.',
        citedExpenseIds: [],
        citedInvoiceIds: [],
        recordsFound: false,
        inferenceMode: 'deterministic',
        modelUsed: 'Deterministic Record Engine',
      };
    }

    return {
      answer: `Based on your records (${context.expenses.length} expenses and ${context.invoices.length} invoices saved), I could not find records matching your specific question "${question}". Financial calculations are not invented. Try asking "Which invoices remain unpaid?", "Show my expenses by category", or "What are my total expenses?".`,
      citedExpenseIds: [],
      citedInvoiceIds: [],
      recordsFound: false,
      inferenceMode: 'deterministic',
      modelUsed: 'Deterministic Record Engine',
    };
  }
}
