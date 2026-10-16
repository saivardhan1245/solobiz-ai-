import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getAllSettings,
  updateAllSettings,
  isHostedEnvironment,
  getExpenses,
  getExpenseById,
  insertExpense,
  updateExpense,
  deleteExpense,
  getInvoices,
  getInvoiceById,
  insertInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  clearDatabase,
} from './server/db.js';
import { modelManager } from './server/models/index.js';
import { extractTextFromImage, extractTextFromPDF, SYNTHETIC_FIXTURES } from './server/ocr.js';
import { ExpenseRecord, InvoiceRecord, ModelProviderType } from './server/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portArg = portIndex !== -1 && args[portIndex + 1] ? Number(args[portIndex + 1]) : null;
const PORT = Number(process.env.PORT) || portArg || 3000;

// Setup upload directory
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage with path traversal prevention
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename to avoid path traversal
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${safeBase}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, PDF`));
    }
  },
});

app.use(express.json({ limit: '15mb' }));

// Initialize SQLite Database
await initDatabase();

// API Endpoints

// 1. Health & Active Model Status
app.get('/api/health', async (_req, res) => {
  const isHosted = isHostedEnvironment();
  const provider = modelManager.getActiveProvider();
  const health = await provider.healthCheck();
  const settings = getAllSettings();

  const isFallback = provider.id !== settings.modelProvider;
  let fallbackReason: string | null = null;

  if (isFallback) {
    if (isHosted && settings.modelProvider === 'ollama') {
      fallbackReason = 'Hosted deployment: Local Ollama (127.0.0.1:11434) is unavailable in cloud environments. SoloBiz AI defaulted to safe Offline Processing. To use Gemma, run `ollama run gemma2:2b` locally.';
    } else {
      fallbackReason = `Configured provider '${settings.modelProvider}' is currently unavailable. Defaulted to Offline Processing.`;
    }
  }

  res.json({
    status: 'ok',
    isHosted,
    configuredProvider: settings.modelProvider,
    activeProvider: {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      health,
      model: settings.ollamaModel,
      endpoint: settings.ollamaEndpoint,
      isFallback,
      fallbackReason,
    },
    allProviders: modelManager.getAllProvidersInfo(),
  });
});

// 2. Settings
app.get('/api/settings', (_req, res) => {
  res.json({
    settings: getAllSettings(),
    providers: modelManager.getAllProvidersInfo(),
  });
});

app.post('/api/settings', (req, res) => {
  const updated = updateAllSettings(req.body);
  res.json({ success: true, settings: updated });
});

// 3. Test Provider Connectivity
app.post('/api/test-provider', async (req, res) => {
  const { providerId, endpoint, model } = req.body;
  const targetProviderId: ModelProviderType = providerId || 'ollama';

  const provider = modelManager.getProvider(targetProviderId);
  if (!provider) {
    return res.status(400).json({ ok: false, message: `Unknown provider: ${targetProviderId}` });
  }

  if (targetProviderId === 'ollama' && endpoint && model) {
    (provider as any).setConfiguration(endpoint, model);
  }

  const result = await provider.healthCheck();
  res.json(result);
});

// 4. Test Fixtures (for evaluation without needing real confidential receipts)
app.get('/api/fixtures', (_req, res) => {
  res.json({ fixtures: SYNTHETIC_FIXTURES });
});

app.post('/api/fixtures/parse', async (req, res) => {
  const { fixtureId } = req.body;
  const fixture = SYNTHETIC_FIXTURES.find((f) => f.id === fixtureId);
  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found' });
  }

  const provider = modelManager.getActiveProvider();
  try {
    const extraction = await provider.extractReceipt(fixture.ocrText, fixture.filename);
    res.json({
      success: true,
      extraction,
      fixtureNotice: 'Loaded from synthetic test fixture. Not saved to database until user verification.',
      sourceDocumentName: fixture.filename,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message, provider: provider.name });
  }
});

// 5. Document Upload and Extraction
app.post('/api/extract', upload.single('document'), async (req, res) => {
  let ocrText = '';
  let filename = '';
  let docPath = '';
  let mimetype = '';

  try {
    if (req.file) {
      filename = req.file.originalname;
      docPath = req.file.path;
      mimetype = req.file.mimetype;

      if (mimetype === 'application/pdf') {
        ocrText = await extractTextFromPDF(docPath);
      } else {
        ocrText = await extractTextFromImage(docPath);
      }
    } else if (req.body.rawText) {
      ocrText = req.body.rawText;
      filename = req.body.filename || 'manual_entry.txt';
    } else {
      return res.status(400).json({ error: 'No document file or text provided' });
    }

    if (!ocrText || ocrText.trim().length === 0) {
      return res.status(422).json({
        error: 'Unable to extract legible text from document. Please ensure document is not blurry or password-protected.',
      });
    }

    const provider = modelManager.getActiveProvider();
    const extraction = await provider.extractReceipt(ocrText, filename);

    res.json({
      success: true,
      extraction,
      sourceDocumentName: filename,
      sourceDocumentPath: docPath,
      sourceDocumentType: mimetype || 'text/plain',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: message,
      activeProvider: modelManager.getActiveProvider().name,
      suggestion: 'You can test or switch inference mode in Settings (e.g. Deterministic Rule Parser or verify Ollama service).',
    });
  }
});

// 6. Expenses Endpoints
app.get('/api/expenses', (_req, res) => {
  const expenses = getExpenses();
  res.json({ expenses });
});

app.post('/api/expenses', (req, res) => {
  const body = req.body;
  if (!body.merchant || body.total === undefined) {
    return res.status(400).json({ error: 'Merchant and total are required' });
  }

  const now = new Date().toISOString();
  const expense: ExpenseRecord = {
    id: body.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    merchant: body.merchant.trim(),
    date: body.date || now.split('T')[0],
    currency: body.currency || 'USD',
    subtotal: body.subtotal !== null && body.subtotal !== undefined ? Number(body.subtotal) : null,
    tax: body.tax !== null && body.tax !== undefined ? Number(body.tax) : null,
    total: Number(body.total),
    category: body.category || 'General',
    notes: body.notes || undefined,
    sourceDocumentName: body.sourceDocumentName || undefined,
    sourceDocumentPath: body.sourceDocumentPath || undefined,
    sourceDocumentType: body.sourceDocumentType || undefined,
    extractionStatus: body.extractionStatus || 'verified',
    confidenceScores: body.confidenceScores,
    userEditedFields: body.userEditedFields || [],
    createdAt: now,
    updatedAt: now,
  };

  const created = insertExpense(expense);
  res.status(201).json({ success: true, expense: created });
});

app.put('/api/expenses/:id', (req, res) => {
  const updated = updateExpense(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  res.json({ success: true, expense: updated });
});

app.delete('/api/expenses/:id', (req, res) => {
  const ok = deleteExpense(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  res.json({ success: true });
});

// 7. Invoices Endpoints
app.get('/api/invoices', (_req, res) => {
  const invoices = getInvoices();
  res.json({ invoices });
});

app.post('/api/invoices', (req, res) => {
  const body = req.body;
  if (!body.clientName || !body.lineItems || !Array.isArray(body.lineItems)) {
    return res.status(400).json({ error: 'Client name and line items are required' });
  }

  // Calculate arithmetic strictly in application code
  const lineItems = body.lineItems.map((item: any, idx: number) => {
    const qty = Math.max(0, Number(item.quantity) || 1);
    const unit = Math.max(0, Number(item.unitPrice) || 0);
    const amt = Math.round(qty * unit * 100) / 100;
    return {
      id: item.id || `item-${idx + 1}`,
      description: item.description || 'Service',
      quantity: qty,
      unitPrice: unit,
      amount: amt,
    };
  });

  const subtotal = Math.round(lineItems.reduce((acc: number, it: any) => acc + it.amount, 0) * 100) / 100;
  const taxRate = Math.max(0, Number(body.taxRate) || 0);
  const taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const now = new Date().toISOString();
  const invoice: InvoiceRecord = {
    id: body.id || `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    invoiceNumber: body.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    clientName: body.clientName.trim(),
    clientEmail: body.clientEmail || '',
    clientAddress: body.clientAddress || '',
    issueDate: body.issueDate || now.split('T')[0],
    dueDate: body.dueDate || now.split('T')[0],
    currency: body.currency || 'USD',
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    notes: body.notes || '',
    paymentTerms: body.paymentTerms || 'Payment due within 14 days of invoice date.',
    status: body.status || 'draft',
    createdAt: now,
    updatedAt: now,
  };

  const created = insertInvoice(invoice);
  res.status(201).json({ success: true, invoice: created });
});

app.put('/api/invoices/:id', (req, res) => {
  const updated = updateInvoice(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json({ success: true, invoice: updated });
});

app.patch('/api/invoices/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['draft', 'sent', 'paid', 'overdue'].includes(status)) {
    return res.status(400).json({ error: 'Invalid invoice status' });
  }
  const updated = updateInvoiceStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json({ success: true, invoice: updated });
});

app.delete('/api/invoices/:id', (req, res) => {
  const ok = deleteInvoice(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json({ success: true });
});

// 8. Grounded Business Assistant
app.post('/api/assistant', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question string is required' });
  }

  const expenses = getExpenses();
  const invoices = getInvoices();
  const provider = modelManager.getActiveProvider();

  try {
    const answer = await provider.askAssistant(question, { expenses, invoices });
    res.json({
      success: true,
      ...answer,
      activeProvider: provider.name,
      activeType: provider.type,
    });
  } catch (err: unknown) {
    // If Ollama fails, fall back to deterministic parser with clear explanation
    console.warn('Primary provider assistant error, attempting deterministic query:', err);
    const deterministic = modelManager.getProvider('deterministic')!;
    const fallbackAnswer = await deterministic.askAssistant(question, { expenses, invoices });
    res.json({
      success: true,
      ...fallbackAnswer,
      warning: `Local model query failed (${err instanceof Error ? err.message : String(err)}). Answer computed via Deterministic Record Engine.`,
    });
  }
});

// 9. Financial Summary (Calculated in application code, distinct by currency)
app.get('/api/summary', (_req, res) => {
  const expenses = getExpenses();
  const invoices = getInvoices();

  // Expenses grouped strictly by currency
  const expensesByCurrency: Record<string, number> = {};
  const expensesByCategory: Record<string, number> = {};

  for (const exp of expenses) {
    expensesByCurrency[exp.currency] = (expensesByCurrency[exp.currency] || 0) + exp.total;
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.total;
  }

  // Invoices grouped strictly by currency & status
  const confirmedIncomeByCurrency: Record<string, number> = {};
  const outstandingByCurrency: Record<string, number> = {};

  for (const inv of invoices) {
    if (inv.status === 'paid') {
      confirmedIncomeByCurrency[inv.currency] = (confirmedIncomeByCurrency[inv.currency] || 0) + inv.total;
    } else if (inv.status === 'sent' || inv.status === 'overdue') {
      outstandingByCurrency[inv.currency] = (outstandingByCurrency[inv.currency] || 0) + inv.total;
    }
  }

  res.json({
    totalExpenseRecords: expenses.length,
    totalInvoiceRecords: invoices.length,
    expensesByCurrency,
    expensesByCategory,
    confirmedIncomeByCurrency,
    outstandingByCurrency,
    recentExpenses: expenses.slice(0, 5),
    recentInvoices: invoices.slice(0, 5),
  });
});

// 10. Database Reset (for clean testing)
app.post('/api/reset', (_req, res) => {
  clearDatabase();
  res.json({ success: true, message: 'Database reset to empty state.' });
});

// Setup Vite middleware for development or serve dist in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');
  const distExists = fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction && distExists) {
    console.log(`[SoloBiz AI] Serving production build from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('[SoloBiz AI] Mounting Vite development middleware...');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SoloBiz AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
