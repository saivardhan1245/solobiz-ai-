import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { extractTextFromPDF } from '../server/ocr.js';
import { DeterministicProvider } from '../server/models/deterministic.js';

async function runRegressionTest() {
  console.log('=== STARTING REGRESSION TEST: PDF EXTRACTION ===\n');

  const pdfPath = path.resolve(process.cwd(), 'tests', 'fixtures', 'wordpress-pdf-invoice-plugin-sample.pdf');
  assert(fs.existsSync(pdfPath), `Sample PDF file not found at: ${pdfPath}`);

  console.log(`1. Loading sample PDF from: ${pdfPath}`);
  const startTime = Date.now();

  // Step 1: Extract text using PDFParse
  const ocrText = await extractTextFromPDF(pdfPath);
  console.log(`2. Extracted text length: ${ocrText.length} characters`);
  assert(ocrText.length > 50, 'Extracted text should not be empty');

  // Step 2: Run deterministic parser
  const provider = new DeterministicProvider();
  const result = await provider.extractReceipt(ocrText, 'wordpress-pdf-invoice-plugin-sample.pdf');

  console.log('\n--- EXTRACTED JSON RESULT ---');
  console.log(JSON.stringify(result, null, 2));
  console.log('-----------------------------\n');

  // Step 3: Assert expected fields
  console.log('3. Validating expected fields against requirements:');

  // Merchant
  console.log(`   - Merchant: "${result.merchant.value}" (Expected: "DEMO - Sliced Invoices")`);
  assert.strictEqual(
    result.merchant.value,
    'DEMO - Sliced Invoices',
    `Expected merchant to be 'DEMO - Sliced Invoices', got '${result.merchant.value}'`
  );

  // Invoice date
  console.log(`   - Invoice Date: "${result.date.value}" (Expected: "2016-01-25")`);
  assert.strictEqual(
    result.date.value,
    '2016-01-25',
    `Expected date to be '2016-01-25', got '${result.date.value}'`
  );

  // Subtotal
  console.log(`   - Subtotal: ${result.subtotal.value} (Expected: 85.00)`);
  assert.strictEqual(
    result.subtotal.value,
    85,
    `Expected subtotal to be 85.00, got ${result.subtotal.value}`
  );

  // Tax
  console.log(`   - Tax: ${result.tax.value} (Expected: 8.50)`);
  assert.strictEqual(
    result.tax.value,
    8.5,
    `Expected tax to be 8.50, got ${result.tax.value}`
  );

  // Total
  console.log(`   - Total: ${result.total.value} (Expected: 93.50)`);
  assert.strictEqual(
    result.total.value,
    93.5,
    `Expected total to be 93.50, got ${result.total.value}`
  );

  // Currency
  console.log(`   - Currency: "${result.currency.value}" (Expected: "USD")`);
  assert.strictEqual(
    result.currency.value,
    'USD',
    `Expected currency to be 'USD', got '${result.currency.value}'`
  );

  // Verify that the bugged value 595.28 is NEVER selected
  assert.notStrictEqual(
    result.total.value,
    595.28,
    'Total must NOT be 595.28 (raw PDF MediaBox width)'
  );

  console.log(`\nALL ASSERTIONS PASSED in ${Date.now() - startTime}ms!`);
}

runRegressionTest().catch((err) => {
  console.error('\nREGRESSION TEST FAILED:', err);
  process.exit(1);
});
