export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR' | string;

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  merchant: string;
  date: string;
  currency: CurrencyCode;
  subtotal: number | null;
  tax: number | null;
  total: number;
  category: string;
  notes?: string;
  sourceDocumentName?: string;
  sourceDocumentPath?: string;
  sourceDocumentType?: string;
  extractionStatus: 'verified' | 'manual' | 'flagged';
  confidenceScores?: Record<string, number>;
  userEditedFields?: string[];
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  issueDate: string;
  dueDate: string;
  currency: CurrencyCode;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export type ModelProviderType = 'ollama' | 'deterministic' | 'gemini';

export interface AppSettings {
  modelProvider: ModelProviderType;
  ollamaEndpoint: string;
  ollamaModel: string;
  businessName: string;
  businessEmail: string;
  businessCurrency: CurrencyCode;
  businessTaxId: string;
  businessAddress: string;
}

export interface ExtractedField<T> {
  value: T;
  confidence: number;
  isUncertain?: boolean;
}

export interface ExtractionResult {
  merchant: ExtractedField<string>;
  date: ExtractedField<string>;
  currency: ExtractedField<CurrencyCode>;
  subtotal: ExtractedField<number | null>;
  tax: ExtractedField<number | null>;
  total: ExtractedField<number>;
  category: ExtractedField<string>;
  lineItems: Array<{ description: string; amount: number }>;
  rawOcrText: string;
  inferenceMode: 'local' | 'deterministic' | 'remote';
  modelUsed: string;
  warnings: string[];
  validationErrors: string[];
}

export interface AssistantAnswer {
  answer: string;
  citedExpenseIds: string[];
  citedInvoiceIds: string[];
  recordsFound: boolean;
  inferenceMode: 'local' | 'deterministic' | 'remote';
  modelUsed: string;
  warning?: string;
}

export interface SummaryData {
  totalExpenseRecords: number;
  totalInvoiceRecords: number;
  expensesByCurrency: Record<string, number>;
  expensesByCategory: Record<string, number>;
  confirmedIncomeByCurrency: Record<string, number>;
  outstandingByCurrency: Record<string, number>;
  recentExpenses: ExpenseRecord[];
  recentInvoices: InvoiceRecord[];
}

export interface HealthData {
  status: string;
  isHosted?: boolean;
  configuredProvider?: ModelProviderType;
  activeProvider: {
    id: ModelProviderType;
    name: string;
    type: 'local' | 'deterministic' | 'remote';
    health: {
      ok: boolean;
      message: string;
      latencyMs: number;
    };
    model: string;
    endpoint: string;
    isFallback?: boolean;
    fallbackReason?: string | null;
  };
  allProviders: Array<{
    id: ModelProviderType;
    name: string;
    type: 'local' | 'deterministic' | 'remote';
    description: string;
    privacyNotice: string;
    isActive: boolean;
    isAvailable?: boolean;
    statusNote?: string;
  }>;
}

export interface TestFixture {
  id: string;
  name: string;
  type: string;
  filename: string;
  ocrText: string;
  expected: {
    merchant: string;
    date: string;
    total: number;
    currency: string;
    category: string;
  };
}
