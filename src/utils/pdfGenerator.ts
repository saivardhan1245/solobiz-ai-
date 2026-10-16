import { jsPDF } from 'jspdf';
import { InvoiceRecord, AppSettings } from '../types';

export function generateInvoicePDF(invoice: InvoiceRecord, settings?: AppSettings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  // Header Background bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // Business / Freelancer Info (Top Left)
  const businessName = settings?.businessName || 'SoloBiz Freelance';
  const businessEmail = settings?.businessEmail || '';
  const businessAddress = settings?.businessAddress || '';
  const businessTaxId = settings?.businessTaxId ? `Tax ID: ${settings.businessTaxId}` : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(businessName, margin, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  let y = 66;
  if (businessEmail) {
    doc.text(businessEmail, margin, y);
    y += 13;
  }
  if (businessAddress) {
    doc.text(businessAddress, margin, y);
    y += 13;
  }
  if (businessTaxId) {
    doc.text(businessTaxId, margin, y);
  }

  // Invoice Title & Metadata (Top Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE', pageWidth - margin, 50, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, pageWidth - margin, 68, { align: 'right' });
  doc.text(`Issue Date: ${invoice.issueDate}`, pageWidth - margin, 81, { align: 'right' });
  doc.text(`Due Date: ${invoice.dueDate}`, pageWidth - margin, 94, { align: 'right' });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - margin, 107, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(margin, 125, pageWidth - margin, 125);

  // Bill To Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO', margin, 145);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.clientName, margin, 162);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  let billToY = 176;
  if (invoice.clientEmail) {
    doc.text(invoice.clientEmail, margin, billToY);
    billToY += 13;
  }
  if (invoice.clientAddress) {
    doc.text(invoice.clientAddress, margin, billToY);
    billToY += 13;
  }

  // Items Table Header
  const tableStartY = Math.max(billToY + 15, 210);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin, tableStartY, contentWidth, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, tableStartY, margin + contentWidth, tableStartY);
  doc.line(margin, tableStartY + 24, margin + contentWidth, tableStartY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('DESCRIPTION', margin + 10, tableStartY + 16);
  doc.text('QTY', margin + contentWidth - 190, tableStartY + 16, { align: 'right' });
  doc.text('UNIT PRICE', margin + contentWidth - 100, tableStartY + 16, { align: 'right' });
  doc.text('AMOUNT', margin + contentWidth - 10, tableStartY + 16, { align: 'right' });

  // Items Table Rows
  let currentY = tableStartY + 24;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  invoice.lineItems.forEach((item, index) => {
    currentY += 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    // Truncate long descriptions
    const desc = item.description.length > 55 ? item.description.slice(0, 52) + '...' : item.description;
    doc.text(desc, margin + 10, currentY - 7);

    // Qty
    doc.text(item.quantity.toString(), margin + contentWidth - 190, currentY - 7, { align: 'right' });

    // Unit Price
    doc.text(`${invoice.currency} ${item.unitPrice.toFixed(2)}`, margin + contentWidth - 100, currentY - 7, { align: 'right' });

    // Amount
    doc.text(`${invoice.currency} ${item.amount.toFixed(2)}`, margin + contentWidth - 10, currentY - 7, { align: 'right' });

    // Subtle row line
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, currentY, margin + contentWidth, currentY);
  });

  // Summary Totals Box (Right Aligned)
  const totalsY = currentY + 20;
  const totalsWidth = 220;
  const totalsX = margin + contentWidth - totalsWidth;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', totalsX, totalsY);
  doc.setTextColor(15, 23, 42);
  doc.text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, margin + contentWidth - 10, totalsY, { align: 'right' });

  let taxY = totalsY + 16;
  if (invoice.taxRate > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text(`Tax (${invoice.taxRate}%):`, totalsX, taxY);
    doc.setTextColor(15, 23, 42);
    doc.text(`${invoice.currency} ${invoice.taxAmount.toFixed(2)}`, margin + contentWidth - 10, taxY, { align: 'right' });
    taxY += 16;
  }

  // Total Line
  doc.setDrawColor(203, 213, 225);
  doc.line(totalsX, taxY - 4, margin + contentWidth, taxY - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Amount Due:', totalsX, taxY + 12);
  doc.text(`${invoice.currency} ${invoice.total.toFixed(2)}`, margin + contentWidth - 10, taxY + 12, { align: 'right' });

  // Payment Terms & Notes (Bottom Left)
  let termsY = totalsY;
  if (invoice.paymentTerms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('PAYMENT TERMS', margin, termsY);
    termsY += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitTerms = doc.splitTextToSize(invoice.paymentTerms, contentWidth - totalsWidth - 30);
    doc.text(splitTerms, margin, termsY);
    termsY += splitTerms.length * 11 + 10;
  }

  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('NOTES', margin, termsY);
    termsY += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(invoice.notes, contentWidth - totalsWidth - 30);
    doc.text(splitNotes, margin, termsY);
  }

  // Footer Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated with SoloBiz AI — Open-source freelance business suite.', margin, pageHeight - 25);

  return doc;
}

export function downloadInvoicePDF(invoice: InvoiceRecord, settings?: AppSettings) {
  const doc = generateInvoicePDF(invoice, settings);
  const safeNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Invoice_${safeNum}.pdf`);
}
