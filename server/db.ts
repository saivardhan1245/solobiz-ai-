import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { ExpenseRecord, InvoiceRecord, AppSettings } from './types.js';

let db: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'solobiz.sqlite');

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const filebuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(filebuffer);
    } catch (err) {
      console.warn('Failed to load existing SQLite database, initializing fresh one:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Create tables if they do not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      merchant TEXT NOT NULL,
      date TEXT NOT NULL,
      currency TEXT NOT NULL,
      subtotal REAL,
      tax REAL,
      total REAL NOT NULL,
      category TEXT NOT NULL,
      notes TEXT,
      source_document_name TEXT,
      source_document_path TEXT,
      source_document_type TEXT,
      extraction_status TEXT NOT NULL,
      confidence_scores TEXT,
      user_edited_fields TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT NOT NULL,
      client_address TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      currency TEXT NOT NULL,
      line_items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax_rate REAL NOT NULL,
      tax_amount REAL NOT NULL,
      total REAL NOT NULL,
      notes TEXT,
      payment_terms TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  saveDatabase();
  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving SQLite database file:', err);
  }
}

// Settings methods
export function getSetting(key: string, defaultValue = ''): string {
  if (!db) return defaultValue;
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  stmt.bind([key]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return (row.value as string) || defaultValue;
  }
  stmt.free();
  return defaultValue;
}

export function setSetting(key: string, value: string): void {
  if (!db) return;
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  saveDatabase();
}

export function isHostedEnvironment(): boolean {
  return Boolean(
    process.env.APP_URL ||
    process.env.RENDER ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.K_SERVICE ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    (process.env.NODE_ENV === 'production' && !process.env.LOCAL_DEV)
  );
}

export function getAllSettings(): AppSettings {
  const isHosted = isHostedEnvironment();
  const defaultProvider = isHosted ? 'deterministic' : 'ollama';

  const storedProvider = getSetting('modelProvider', '');
  const modelProvider = (storedProvider || defaultProvider) as AppSettings['modelProvider'];

  return {
    modelProvider,
    ollamaEndpoint: getSetting('ollamaEndpoint', 'http://127.0.0.1:11434'),
    ollamaModel: getSetting('ollamaModel', 'gemma2:2b'),
    businessName: getSetting('businessName', ''),
    businessEmail: getSetting('businessEmail', ''),
    businessCurrency: getSetting('businessCurrency', 'USD'),
    businessTaxId: getSetting('businessTaxId', ''),
    businessAddress: getSetting('businessAddress', ''),
  };
}

export function updateAllSettings(settings: Partial<AppSettings>): AppSettings {
  if (settings.modelProvider) setSetting('modelProvider', settings.modelProvider);
  if (settings.ollamaEndpoint) setSetting('ollamaEndpoint', settings.ollamaEndpoint);
  if (settings.ollamaModel) setSetting('ollamaModel', settings.ollamaModel);
  if (settings.businessName !== undefined) setSetting('businessName', settings.businessName);
  if (settings.businessEmail !== undefined) setSetting('businessEmail', settings.businessEmail);
  if (settings.businessCurrency) setSetting('businessCurrency', settings.businessCurrency);
  if (settings.businessTaxId !== undefined) setSetting('businessTaxId', settings.businessTaxId);
  if (settings.businessAddress !== undefined) setSetting('businessAddress', settings.businessAddress);
  return getAllSettings();
}

// Expenses CRUD
export function getExpenses(): ExpenseRecord[] {
  if (!db) return [];
  const results: ExpenseRecord[] = [];
  const stmt = db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as string,
      merchant: row.merchant as string,
      date: row.date as string,
      currency: row.currency as string,
      subtotal: row.subtotal === null ? null : Number(row.subtotal),
      tax: row.tax === null ? null : Number(row.tax),
      total: Number(row.total),
      category: row.category as string,
      notes: (row.notes as string) || undefined,
      sourceDocumentName: (row.source_document_name as string) || undefined,
      sourceDocumentPath: (row.source_document_path as string) || undefined,
      sourceDocumentType: (row.source_document_type as string) || undefined,
      extractionStatus: row.extraction_status as ExpenseRecord['extractionStatus'],
      confidenceScores: row.confidence_scores ? JSON.parse(row.confidence_scores as string) : undefined,
      userEditedFields: row.user_edited_fields ? JSON.parse(row.user_edited_fields as string) : undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    });
  }
  stmt.free();
  return results;
}

export function getExpenseById(id: string): ExpenseRecord | null {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM expenses WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id as string,
      merchant: row.merchant as string,
      date: row.date as string,
      currency: row.currency as string,
      subtotal: row.subtotal === null ? null : Number(row.subtotal),
      tax: row.tax === null ? null : Number(row.tax),
      total: Number(row.total),
      category: row.category as string,
      notes: (row.notes as string) || undefined,
      sourceDocumentName: (row.source_document_name as string) || undefined,
      sourceDocumentPath: (row.source_document_path as string) || undefined,
      sourceDocumentType: (row.source_document_type as string) || undefined,
      extractionStatus: row.extraction_status as ExpenseRecord['extractionStatus'],
      confidenceScores: row.confidence_scores ? JSON.parse(row.confidence_scores as string) : undefined,
      userEditedFields: row.user_edited_fields ? JSON.parse(row.user_edited_fields as string) : undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
  stmt.free();
  return null;
}

export function insertExpense(expense: ExpenseRecord): ExpenseRecord {
  if (!db) throw new Error('Database not initialized');
  db.run(
    `INSERT INTO expenses (
      id, merchant, date, currency, subtotal, tax, total, category, notes,
      source_document_name, source_document_path, source_document_type,
      extraction_status, confidence_scores, user_edited_fields, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      expense.merchant,
      expense.date,
      expense.currency,
      expense.subtotal,
      expense.tax,
      expense.total,
      expense.category,
      expense.notes || null,
      expense.sourceDocumentName || null,
      expense.sourceDocumentPath || null,
      expense.sourceDocumentType || null,
      expense.extractionStatus,
      expense.confidenceScores ? JSON.stringify(expense.confidenceScores) : null,
      expense.userEditedFields ? JSON.stringify(expense.userEditedFields) : null,
      expense.createdAt,
      expense.updatedAt,
    ]
  );
  saveDatabase();
  return expense;
}

export function updateExpense(id: string, updates: Partial<ExpenseRecord>): ExpenseRecord | null {
  const existing = getExpenseById(id);
  if (!existing || !db) return null;

  const updated: ExpenseRecord = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  db.run(
    `UPDATE expenses SET
      merchant = ?, date = ?, currency = ?, subtotal = ?, tax = ?, total = ?,
      category = ?, notes = ?, extraction_status = ?, user_edited_fields = ?, updated_at = ?
    WHERE id = ?`,
    [
      updated.merchant,
      updated.date,
      updated.currency,
      updated.subtotal,
      updated.tax,
      updated.total,
      updated.category,
      updated.notes || null,
      updated.extractionStatus,
      updated.userEditedFields ? JSON.stringify(updated.userEditedFields) : null,
      updated.updatedAt,
      id,
    ]
  );
  saveDatabase();
  return updated;
}

export function deleteExpense(id: string): boolean {
  if (!db) return false;
  const existing = getExpenseById(id);
  if (!existing) return false;

  db.run('DELETE FROM expenses WHERE id = ?', [id]);
  saveDatabase();

  // If there's an associated file, remove it cleanly
  if (existing.sourceDocumentPath && fs.existsSync(existing.sourceDocumentPath)) {
    try {
      fs.unlinkSync(existing.sourceDocumentPath);
    } catch (e) {
      console.warn('Could not delete expense file:', e);
    }
  }

  return true;
}

// Invoices CRUD
export function getInvoices(): InvoiceRecord[] {
  if (!db) return [];
  const results: InvoiceRecord[] = [];
  const stmt = db.prepare('SELECT * FROM invoices ORDER BY issue_date DESC, created_at DESC');
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id as string,
      invoiceNumber: row.invoice_number as string,
      clientName: row.client_name as string,
      clientEmail: row.client_email as string,
      clientAddress: (row.client_address as string) || undefined,
      issueDate: row.issue_date as string,
      dueDate: row.due_date as string,
      currency: row.currency as string,
      lineItems: JSON.parse(row.line_items as string || '[]'),
      subtotal: Number(row.subtotal),
      taxRate: Number(row.tax_rate),
      taxAmount: Number(row.tax_amount),
      total: Number(row.total),
      notes: (row.notes as string) || undefined,
      paymentTerms: (row.payment_terms as string) || undefined,
      status: row.status as InvoiceRecord['status'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    });
  }
  stmt.free();
  return results;
}

export function getInvoiceById(id: string): InvoiceRecord | null {
  if (!db) return null;
  const stmt = db.prepare('SELECT * FROM invoices WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id as string,
      invoiceNumber: row.invoice_number as string,
      clientName: row.client_name as string,
      clientEmail: row.client_email as string,
      clientAddress: (row.client_address as string) || undefined,
      issueDate: row.issue_date as string,
      dueDate: row.due_date as string,
      currency: row.currency as string,
      lineItems: JSON.parse(row.line_items as string || '[]'),
      subtotal: Number(row.subtotal),
      taxRate: Number(row.tax_rate),
      taxAmount: Number(row.tax_amount),
      total: Number(row.total),
      notes: (row.notes as string) || undefined,
      paymentTerms: (row.payment_terms as string) || undefined,
      status: row.status as InvoiceRecord['status'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
  stmt.free();
  return null;
}

export function insertInvoice(invoice: InvoiceRecord): InvoiceRecord {
  if (!db) throw new Error('Database not initialized');
  db.run(
    `INSERT INTO invoices (
      id, invoice_number, client_name, client_email, client_address,
      issue_date, due_date, currency, line_items, subtotal, tax_rate,
      tax_amount, total, notes, payment_terms, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice.id,
      invoice.invoiceNumber,
      invoice.clientName,
      invoice.clientEmail,
      invoice.clientAddress || null,
      invoice.issueDate,
      invoice.dueDate,
      invoice.currency,
      JSON.stringify(invoice.lineItems),
      invoice.subtotal,
      invoice.taxRate,
      invoice.taxAmount,
      invoice.total,
      invoice.notes || null,
      invoice.paymentTerms || null,
      invoice.status,
      invoice.createdAt,
      invoice.updatedAt,
    ]
  );
  saveDatabase();
  return invoice;
}

export function updateInvoice(id: string, updates: Partial<InvoiceRecord>): InvoiceRecord | null {
  const existing = getInvoiceById(id);
  if (!existing || !db) return null;

  const updated: InvoiceRecord = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  db.run(
    `UPDATE invoices SET
      invoice_number = ?, client_name = ?, client_email = ?, client_address = ?,
      issue_date = ?, due_date = ?, currency = ?, line_items = ?, subtotal = ?,
      tax_rate = ?, tax_amount = ?, total = ?, notes = ?, payment_terms = ?,
      status = ?, updated_at = ?
    WHERE id = ?`,
    [
      updated.invoiceNumber,
      updated.clientName,
      updated.clientEmail,
      updated.clientAddress || null,
      updated.issueDate,
      updated.dueDate,
      updated.currency,
      JSON.stringify(updated.lineItems),
      updated.subtotal,
      updated.taxRate,
      updated.taxAmount,
      updated.total,
      updated.notes || null,
      updated.paymentTerms || null,
      updated.status,
      updated.updatedAt,
      id,
    ]
  );
  saveDatabase();
  return updated;
}

export function updateInvoiceStatus(id: string, status: InvoiceRecord['status']): InvoiceRecord | null {
  return updateInvoice(id, { status });
}

export function deleteInvoice(id: string): boolean {
  if (!db) return false;
  const existing = getInvoiceById(id);
  if (!existing) return false;
  db.run('DELETE FROM invoices WHERE id = ?', [id]);
  saveDatabase();
  return true;
}

export function clearDatabase(): void {
  if (!db) return;
  db.run('DELETE FROM expenses');
  db.run('DELETE FROM invoices');
  saveDatabase();
}
