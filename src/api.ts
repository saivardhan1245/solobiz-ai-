import {
  AppSettings,
  ExpenseRecord,
  InvoiceRecord,
  ExtractionResult,
  AssistantAnswer,
  SummaryData,
  HealthData,
  TestFixture,
} from './types';

export async function fetchHealth(): Promise<HealthData> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Failed to fetch health');
  return res.json();
}

export async function fetchSettings(): Promise<{ settings: AppSettings; providers: any[] }> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function testProvider(providerId: string, endpoint?: string, model?: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const res = await fetch('/api/test-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, endpoint, model }),
  });
  return res.json();
}

export async function fetchSummary(): Promise<SummaryData> {
  const res = await fetch('/api/summary');
  if (!res.ok) throw new Error('Failed to fetch financial summary');
  return res.json();
}

export async function fetchExpenses(): Promise<ExpenseRecord[]> {
  const res = await fetch('/api/expenses');
  if (!res.ok) throw new Error('Failed to fetch expenses');
  const data = await res.json();
  return data.expenses || [];
}

export async function createExpense(expense: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
  const res = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create expense' }));
    throw new Error(err.error || 'Failed to create expense');
  }
  const data = await res.json();
  return data.expense;
}

export async function updateExpense(id: string, updates: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
  const res = await fetch(`/api/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update expense');
  const data = await res.json();
  return data.expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete expense');
}

export async function fetchInvoices(): Promise<InvoiceRecord[]> {
  const res = await fetch('/api/invoices');
  if (!res.ok) throw new Error('Failed to fetch invoices');
  const data = await res.json();
  return data.invoices || [];
}

export async function createInvoice(invoice: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create invoice' }));
    throw new Error(err.error || 'Failed to create invoice');
  }
  const data = await res.json();
  return data.invoice;
}

export async function updateInvoice(id: string, updates: Partial<InvoiceRecord>): Promise<InvoiceRecord> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update invoice');
  const data = await res.json();
  return data.invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceRecord['status']): Promise<InvoiceRecord> {
  const res = await fetch(`/api/invoices/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  const data = await res.json();
  return data.invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete invoice');
}

export async function uploadAndExtract(formData: FormData): Promise<{
  success: boolean;
  extraction: ExtractionResult;
  sourceDocumentName?: string;
  sourceDocumentPath?: string;
  sourceDocumentType?: string;
}> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Document extraction failed' }));
    throw new Error(err.error || 'Extraction failed');
  }
  return res.json();
}

export async function extractFromRawText(rawText: string, filename?: string): Promise<{
  success: boolean;
  extraction: ExtractionResult;
  sourceDocumentName?: string;
  sourceDocumentPath?: string;
  sourceDocumentType?: string;
}> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Text extraction failed' }));
    throw new Error(err.error || 'Extraction failed');
  }
  return res.json();
}

export async function fetchFixtures(): Promise<TestFixture[]> {
  const res = await fetch('/api/fixtures');
  if (!res.ok) throw new Error('Failed to fetch fixtures');
  const data = await res.json();
  return data.fixtures || [];
}

export async function parseFixture(fixtureId: string): Promise<{
  success: boolean;
  extraction: ExtractionResult;
  fixtureNotice: string;
  sourceDocumentName: string;
}> {
  const res = await fetch('/api/fixtures/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fixtureId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Fixture parsing failed' }));
    throw new Error(err.error || 'Failed to parse fixture');
  }
  return res.json();
}

export async function askAssistant(question: string): Promise<AssistantAnswer> {
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Assistant query failed' }));
    throw new Error(err.error || 'Failed to query assistant');
  }
  return res.json();
}

export async function resetDatabase(): Promise<void> {
  const res = await fetch('/api/reset', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset database');
}
