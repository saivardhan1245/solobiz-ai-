import fs from 'fs';
import path from 'path';

async function runFeatureVerification() {
  console.log('=====================================================');
  console.log('🚀 SOLOBIZ AI COMPREHENSIVE FEATURE VERIFICATION 🚀');
  console.log('=====================================================\n');

  const BASE_URL = 'http://localhost:3000';
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✅ [PASS] ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   └─ ${detail}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // -----------------------------------------------------------------
  // 1. HEALTH & PROVIDER DEFAULTS
  // -----------------------------------------------------------------
  console.log('\n--- 1. Testing Health & Provider Diagnostics ---');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  assert(healthRes.ok && healthData.status === 'ok', 'Health endpoint returns status ok');
  assert(healthData.activeProvider.id === 'deterministic', 'Hosted default falls back to Offline Processing');
  assert(healthData.activeProvider.isFallback === true, 'Fallback flag is accurately communicated to user');
  assert(typeof healthData.activeProvider.fallbackReason === 'string', 'Clear fallback reason provided', healthData.activeProvider.fallbackReason);

  // -----------------------------------------------------------------
  // 2. SETTINGS RETRIEVAL & UPDATE
  // -----------------------------------------------------------------
  console.log('\n--- 2. Testing Settings Configuration ---');
  const settingsRes = await fetch(`${BASE_URL}/api/settings`);
  const settingsData = await settingsRes.json();
  assert(settingsRes.ok && settingsData.settings, 'Settings endpoint returns current config');

  const updateSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: 'Solo Freelancer Studio', currency: 'USD' }),
  });
  const updateSettingsData = await updateSettingsRes.json();
  assert(updateSettingsData.success && updateSettingsData.settings.businessName === 'Solo Freelancer Studio', 'Settings update persisted business name');

  // Test Provider Connection Check
  const testConnRes = await fetch(`${BASE_URL}/api/test-provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId: 'deterministic' }),
  });
  const testConnData = await testConnRes.json();
  assert(testConnData.ok === true, 'Deterministic connection check returns healthy');

  // -----------------------------------------------------------------
  // 3. RECEIPT EXTRACTION (PDF INVOICE SAMPLE)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Testing PDF Receipt Upload & Extraction ---');
  const samplePdfPath = path.resolve(process.cwd(), 'tests', 'fixtures', 'wordpress-pdf-invoice-plugin-sample.pdf');
  assert(fs.existsSync(samplePdfPath), 'Sample PDF exists in test fixtures');

  const pdfBuffer = fs.readFileSync(samplePdfPath);
  const formData = new FormData();
  formData.append('document', new Blob([pdfBuffer], { type: 'application/pdf' }), 'wordpress-pdf-invoice-plugin-sample.pdf');

  const uploadRes = await fetch(`${BASE_URL}/api/extract`, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  assert(uploadRes.ok && uploadData.success, 'PDF upload and extraction completed successfully');

  const ext = uploadData.extraction;
  assert(ext.merchant.value === 'DEMO - Sliced Invoices', 'Extracted Merchant is "DEMO - Sliced Invoices"', `Got: "${ext.merchant.value}"`);
  assert(ext.date.value === '2016-01-25', 'Extracted Invoice Date is "2016-01-25"', `Got: "${ext.date.value}"`);
  assert(ext.subtotal.value === 85, 'Extracted Subtotal is 85.00', `Got: ${ext.subtotal.value}`);
  assert(ext.tax.value === 8.5, 'Extracted Tax is 8.50', `Got: ${ext.tax.value}`);
  assert(ext.total.value === 93.5, 'Extracted Total is 93.50 (NOT 595.28)', `Got: ${ext.total.value}`);
  assert(ext.currency.value === 'USD', 'Extracted Currency is USD', `Got: ${ext.currency.value}`);

  // -----------------------------------------------------------------
  // 4. EXPENSE CREATION & VERIFICATION WORKFLOW
  // -----------------------------------------------------------------
  console.log('\n--- 4. Testing Expense Verification & CRUD ---');
  const newExpensePayload = {
    merchant: ext.merchant.value,
    date: ext.date.value,
    currency: ext.currency.value,
    subtotal: ext.subtotal.value,
    tax: ext.tax.value,
    total: ext.total.value,
    category: ext.category.value || 'Software & Subscriptions',
    notes: 'Verified from sample PDF invoice',
    sourceDocumentName: uploadData.sourceDocumentName,
    sourceDocumentPath: uploadData.sourceDocumentPath,
    sourceDocumentType: uploadData.sourceDocumentType,
    extractionStatus: 'verified',
    userEditedFields: [],
  };

  const createExpenseRes = await fetch(`${BASE_URL}/api/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newExpensePayload),
  });
  const createExpenseData = await createExpenseRes.json();
  assert(createExpenseRes.status === 201 && createExpenseData.success, 'Expense created successfully in database');
  const createdExpenseId = createExpenseData.expense.id;
  assert(Boolean(createdExpenseId), 'Created expense has valid ID', createdExpenseId);

  // Read all expenses
  const getExpensesRes = await fetch(`${BASE_URL}/api/expenses`);
  const getExpensesData = await getExpensesRes.json();
  const foundExpense = getExpensesData.expenses.find((e: any) => e.id === createdExpenseId);
  assert(Boolean(foundExpense), 'Newly created expense found in expense list');
  assert(foundExpense.total === 93.5 && foundExpense.merchant === 'DEMO - Sliced Invoices', 'Expense fields match accurately');

  // Update expense
  const updateExpenseRes = await fetch(`${BASE_URL}/api/expenses/${createdExpenseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes: 'Updated verification note' }),
  });
  const updateExpenseData = await updateExpenseRes.json();
  assert(updateExpenseData.success && updateExpenseData.expense.notes === 'Updated verification note', 'Expense update persisted');

  // -----------------------------------------------------------------
  // 5. INVOICE BUILDER & ARITHMETIC
  // -----------------------------------------------------------------
  console.log('\n--- 5. Testing Invoice Builder & Arithmetic ---');
  const invoicePayload = {
    clientName: 'Acme Corporation',
    clientEmail: 'billing@acme.com',
    clientAddress: '100 Tech Blvd, Silicon Valley, CA',
    issueDate: '2026-10-15',
    dueDate: '2026-10-29',
    currency: 'USD',
    taxRate: 10,
    lineItems: [
      { description: 'Web Development Services', quantity: 20, unitPrice: 100 },
      { description: 'Cloud Architecture Consulting', quantity: 5, unitPrice: 150 },
    ],
    notes: 'Thank you for your business!',
    status: 'draft',
  };

  const createInvRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoicePayload),
  });
  const createInvData = await createInvRes.json();
  assert(createInvRes.status === 201 && createInvData.success, 'Invoice created successfully');
  const createdInvoice = createInvData.invoice;
  // Subtotal = 20*100 + 5*150 = 2000 + 750 = 2750
  // Tax = 10% of 2750 = 275
  // Total = 3025
  assert(createdInvoice.subtotal === 2750, 'Invoice subtotal calculated strictly in code: 2750', `Got: ${createdInvoice.subtotal}`);
  assert(createdInvoice.taxAmount === 275, 'Invoice tax calculated strictly: 275', `Got: ${createdInvoice.taxAmount}`);
  assert(createdInvoice.total === 3025, 'Invoice total calculated strictly: 3025', `Got: ${createdInvoice.total}`);

  // Test invoice status update
  const statusRes = await fetch(`${BASE_URL}/api/invoices/${createdInvoice.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'paid' }),
  });
  const statusData = await statusRes.json();
  assert(statusData.success && statusData.invoice.status === 'paid', 'Invoice status updated to "paid"');

  // -----------------------------------------------------------------
  // 6. FINANCIAL SUMMARY
  // -----------------------------------------------------------------
  console.log('\n--- 6. Testing Currency-Separated Financial Summary ---');
  const summaryRes = await fetch(`${BASE_URL}/api/summary`);
  const summaryData = await summaryRes.json();
  assert(summaryRes.ok, 'Financial summary endpoint succeeded');
  assert(summaryData.expensesByCurrency['USD'] >= 93.5, 'Summary includes verified USD expense');
  assert(summaryData.confirmedIncomeByCurrency['USD'] >= 3025, 'Summary includes confirmed paid invoice income');

  // -----------------------------------------------------------------
  // 7. GROUNDED BUSINESS ASSISTANT
  // -----------------------------------------------------------------
  console.log('\n--- 7. Testing Record-Grounded Business Assistant ---');
  const assistantRes = await fetch(`${BASE_URL}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'What are my total expenses?' }),
  });
  const assistantData = await assistantRes.json();
  assert(assistantRes.ok && assistantData.success, 'Assistant endpoint responded successfully');
  assert(typeof assistantData.answer === 'string' && assistantData.answer.length > 0, 'Assistant returned grounded answer', assistantData.answer);
  assert(Array.isArray(assistantData.citedExpenseIds), 'Assistant returns citedExpenseIds array');
  assert(Array.isArray(assistantData.citedInvoiceIds), 'Assistant returns citedInvoiceIds array');
  assert(assistantData.recordsFound === true, 'Assistant found relevant financial records');
  assert(assistantData.citedExpenseIds.includes(createdExpenseId), 'Assistant explicitly cited the created expense ID');

  // -----------------------------------------------------------------
  // 8. EXPENSE & INVOICE DELETION (CLEANUP)
  // -----------------------------------------------------------------
  console.log('\n--- 8. Testing Expense and Invoice Deletion ---');
  const delExpRes = await fetch(`${BASE_URL}/api/expenses/${createdExpenseId}`, { method: 'DELETE' });
  const delExpData = await delExpRes.json();
  assert(delExpData.success === true, 'Expense deleted successfully');

  const delInvRes = await fetch(`${BASE_URL}/api/invoices/${createdInvoice.id}`, { method: 'DELETE' });
  const delInvData = await delInvRes.json();
  assert(delInvData.success === true, 'Invoice deleted successfully');

  console.log('\n=====================================================');
  console.log(`🎉 ALL ${passedCount} OF ${totalCount} FEATURE VERIFICATIONS PASSED! 🎉`);
  console.log('=====================================================\n');
}

runFeatureVerification().catch((err) => {
  console.error('Feature verification encountered an error:', err);
  process.exit(1);
});
