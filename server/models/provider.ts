import { ExtractionResult, AssistantAnswer, ExpenseRecord, InvoiceRecord, ModelProviderType } from '../types.js';

export interface AssistantContext {
  expenses: ExpenseRecord[];
  invoices: InvoiceRecord[];
}

export interface ModelProvider {
  id: ModelProviderType;
  name: string;
  type: 'local' | 'deterministic' | 'remote';
  description: string;
  privacyNotice: string;
  healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }>;
  extractReceipt(ocrText: string, filename?: string): Promise<ExtractionResult>;
  askAssistant(question: string, context: AssistantContext): Promise<AssistantAnswer>;
}
