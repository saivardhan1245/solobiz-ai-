import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { PDFParse } from 'pdf-parse';

let tesseractWorkerPromise: Promise<any> | null = null;

async function getWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return tesseractWorkerPromise;
}

export async function extractTextFromImage(filePathOrBuffer: string | Buffer): Promise<string> {
  try {
    const worker = await getWorker();
    const ret = await worker.recognize(filePathOrBuffer);
    return ret.data.text || '';
  } catch (err) {
    console.warn('Tesseract OCR error, attempting basic text fallback:', err);
    return '';
  }
}

export async function extractTextFromPDF(filePathOrBuffer: string | Buffer): Promise<string> {
  const buffer = typeof filePathOrBuffer === 'string' ? fs.readFileSync(filePathOrBuffer) : filePathOrBuffer;

  // 1. Primary: Use PDFParse (pdfjs-dist engine) for standard digital PDF text extraction
  try {
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    const res = await parser.getText();
    if (typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch {}
    }

    const text = (res?.text || '').trim();
    // If we extracted meaningful text, return it
    if (text.length >= 20) {
      return text;
    }
  } catch (err) {
    console.warn('[SoloBiz AI] PDFParse extraction warning:', err);
  }

  // 2. Fallback: If text was empty or insufficient (e.g. scanned image PDF), try OCR
  try {
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    try {
      const screenshotResult = await parser.getScreenshot({ imageBuffer: true } as any);
      if (screenshotResult?.pages && screenshotResult.pages.length > 0) {
        const pageTexts: string[] = [];
        for (const page of screenshotResult.pages.slice(0, 3)) {
          if (page.data) {
            const pageText = await extractTextFromImage(Buffer.from(page.data));
            if (pageText.trim()) pageTexts.push(pageText.trim());
          }
        }
        if (pageTexts.length > 0) {
          return pageTexts.join('\n');
        }
      }
    } catch {}
    if (typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch {}
    }
  } catch (ocrErr) {
    console.warn('[SoloBiz AI] PDF OCR fallback warning:', ocrErr);
  }

  return '';
}

// Built-in synthetic test fixtures for test runs & evaluations
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

export const SYNTHETIC_FIXTURES: TestFixture[] = [
  {
    id: 'fixture-aws-cloud',
    name: 'Cloud Hosting Monthly Bill (Synthetic Test)',
    type: 'receipt',
    filename: 'test_invoice_aws_cloud_2026.pdf',
    ocrText: `ACME CLOUD SERVICES LLC
100 Innovation Way, Suite 400
Austin, TX 78701
Tax ID: US-882910394

INVOICE #: INV-2026-9481
INVOICE DATE: 2026-09-30
DUE DATE: 2026-10-15

BILL TO:
Solo Developer Studio
client@solodev.internal

DESCRIPTION                      QTY    UNIT PRICE    TOTAL
Compute Instance c6g.xlarge       1       $65.00     $65.00
Object Storage Standard 500GB     1       $12.50     $12.50
Managed Database Postgres         1       $18.00     $18.00

SUBTOTAL: $95.50
STATE TAX (8.25%): $7.88
TOTAL AMOUNT DUE: $103.38 USD

Thank you for your business! Payment processed via credit card ending in 4092.`,
    expected: {
      merchant: 'ACME CLOUD SERVICES LLC',
      date: '2026-09-30',
      total: 103.38,
      currency: 'USD',
      category: 'Software & Subscriptions',
    },
  },
  {
    id: 'fixture-hardware-store',
    name: 'Electronics Store Equipment Purchase (Synthetic Test)',
    type: 'receipt',
    filename: 'test_receipt_electronics_hub.jpg',
    ocrText: `METRO ELECTRONICS & HARDWARE
STORE #0482 - SAN FRANCISCO CA
TEL: (415) 555-0199
DATE: 2026-10-08 14:32:10

TRANSACTION: 884019
CASHIER: MARCUS

ITEMS:
- 4K IPS UltraWide Monitor 34"      $429.99
- USB-C Multiport Dock 100W PD       $69.95
- Ergonomic Mechanical Keyboard     $119.00

SUBTOTAL: $618.94
SALES TAX (8.625%): $53.38
TOTAL: $672.32 USD

APPROVED - VISA DEBIT
AUTH: 094812`,
    expected: {
      merchant: 'METRO ELECTRONICS & HARDWARE',
      date: '2026-10-08',
      total: 672.32,
      currency: 'USD',
      category: 'Equipment & Hardware',
    },
  },
  {
    id: 'fixture-client-coffee',
    name: 'Client Meeting Coffee Receipt (Synthetic Test)',
    type: 'receipt',
    filename: 'test_receipt_coffee_roasters.png',
    ocrText: `ARTISAN COFFEE ROASTERS
742 EVERGREEN TERRACE
OCTOBER 11, 2026  09:14 AM
ORDER #381

2x Oat Milk Cappuccino     $11.00
1x Avocado Sourdough Toast  $13.50
1x Sparkling Water           $3.50

SUBTOTAL: $28.00
LOCAL TAX: $2.45
TOTAL: $30.45 USD

TIP: $5.00
GRAND TOTAL: $35.45 USD`,
    expected: {
      merchant: 'ARTISAN COFFEE ROASTERS',
      date: '2026-10-11',
      total: 35.45,
      currency: 'USD',
      category: 'Meals & Entertainment',
    },
  },
];
