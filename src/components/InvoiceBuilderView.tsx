import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  FileText,
  Eye,
} from 'lucide-react';
import { InvoiceRecord, InvoiceStatus, AppSettings, CurrencyCode } from '../types';
import { createInvoice, updateInvoiceStatus, deleteInvoice } from '../api';
import { downloadInvoicePDF } from '../utils/pdfGenerator';

interface InvoiceBuilderViewProps {
  invoices: InvoiceRecord[];
  settings: AppSettings;
  onRefresh: () => void;
}

export const InvoiceBuilderView: React.FC<InvoiceBuilderViewProps> = ({
  invoices,
  settings,
  onRefresh,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<InvoiceRecord | null>(null);

  // New Invoice Form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState<CurrencyCode>(settings.businessCurrency || 'USD');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 14 calendar days of issue date.');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ id: string; description: string; quantity: number; unitPrice: number }>>([
    { id: 'item-1', description: 'Consulting Services (Milestone 1)', quantity: 1, unitPrice: 500 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, val: any) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const calculatedSubtotal = Math.round(
    lineItems.reduce((acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0) * 100
  ) / 100;

  const calculatedTax = Math.round((calculatedSubtotal * ((Number(taxRate) || 0) / 100)) * 100) / 100;
  const calculatedTotal = Math.round((calculatedSubtotal + calculatedTax) * 100) / 100;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setFormError('Client name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await createInvoice({
        invoiceNumber,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientAddress: clientAddress.trim() || undefined,
        issueDate,
        dueDate,
        currency,
        lineItems: lineItems.map((it, idx) => ({
          id: `item-${idx + 1}`,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          amount: Math.round((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) * 100) / 100,
        })),
        taxRate: Number(taxRate) || 0,
        paymentTerms,
        notes,
        status: 'draft',
      });

      setShowCreateModal(false);
      onRefresh();
      setClientName('');
      setClientEmail('');
      setClientAddress('');
      setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setLineItems([{ id: 'item-1', description: '', quantity: 1, unitPrice: 0 }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: InvoiceStatus) => {
    try {
      await updateInvoiceStatus(id, newStatus);
      onRefresh();
    } catch (err) {
      console.error('Failed to update invoice status:', err);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setIsDeletingInvoice(true);
    try {
      await deleteInvoice(id);
      setDeletingInvoiceId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
            PAID
          </span>
        );
      case 'sent':
        return (
          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded">
            SENT
          </span>
        );
      case 'overdue':
        return (
          <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
            OVERDUE
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 border border-slate-700/80 px-2 py-0.5 rounded">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-cyan-400">BILLING & RECEIVABLES</div>
          <h1 className="text-2xl font-black tracking-tight text-white font-display mt-0.5">
            Invoice Studio
          </h1>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Invoice Draft</span>
        </button>
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-12 text-center max-w-lg mx-auto space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-white font-display">No invoices drafted</h3>
          <p className="text-xs text-slate-400">
            Create professional invoices with custom line items and download print-ready PDFs.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-xs"
          >
            Create First Invoice
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-white/[0.06] text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-normal">Invoice #</th>
                  <th className="py-3 px-4 font-normal">Client</th>
                  <th className="py-3 px-4 font-normal">Issue Date</th>
                  <th className="py-3 px-4 font-normal">Due Date</th>
                  <th className="py-3 px-4 font-normal">Status</th>
                  <th className="py-3 px-4 font-normal text-right">Total</th>
                  <th className="py-3 px-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        {inv.clientName}
                      </div>
                      {inv.clientEmail && (
                        <div className="text-[11px] text-slate-400 font-mono">{inv.clientEmail}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {inv.issueDate}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {inv.dueDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(inv.status)}
                        <select
                          value={inv.status}
                          onChange={(e) => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                          className="text-[11px] bg-transparent border-0 text-slate-400 hover:text-white cursor-pointer focus:outline-none"
                        >
                          <option value="draft" className="bg-[#090d1f]">Draft</option>
                          <option value="sent" className="bg-[#090d1f]">Sent</option>
                          <option value="paid" className="bg-[#090d1f]">Paid</option>
                          <option value="overdue" className="bg-[#090d1f]">Overdue</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-right text-white whitespace-nowrap">
                      {inv.currency} {inv.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {deletingInvoiceId === inv.id ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in fade-in">
                          <span className="text-[11px] text-rose-300 font-medium">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(inv.id)}
                            disabled={isDeletingInvoice}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isDeletingInvoice ? '...' : 'Yes, Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingInvoiceId(null)}
                            disabled={isDeletingInvoice}
                            className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-white/[0.06] rounded-md transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => downloadInvoicePDF(inv, settings)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded font-medium text-[11px] transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPreview(inv)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded cursor-pointer"
                            title="Preview Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingInvoiceId(inv.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="rounded-xl border border-white/[0.1] bg-[#090d1f] max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white font-display">Create Invoice Draft</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-lg text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-mono"
                  />
                </div>
              </div>

              {/* Client Info */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2.5">
                <div className="font-bold text-white text-xs">Client Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">Client / Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Labs"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">Client Email</label>
                    <input
                      type="email"
                      placeholder="billing@acme.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Line items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white">Line Items</label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="flex-1 p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        className="w-16 p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white text-xs font-mono text-right"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                        className="w-24 p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white text-xs font-mono text-right"
                      />
                      <div className="w-24 text-right font-mono font-bold text-cyan-400 pr-2">
                        {currency} {((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/[0.06]">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-semibold"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Tax (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-mono text-right"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-semibold text-slate-400">Calculated Total</label>
                  <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 font-mono font-bold text-cyan-300 text-sm text-right tabular-nums">
                    {currency} {calculatedTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || calculatedTotal <= 0}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 disabled:opacity-50 transition-all shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Preview Modal */}
      {selectedInvoiceForPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="rounded-xl border border-white/[0.1] bg-[#090d1f] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  Invoice {selectedInvoiceForPreview.invoiceNumber}
                </h3>
                <span className="text-[11px] text-cyan-400 font-mono">
                  {selectedInvoiceForPreview.status.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoiceForPreview(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg space-y-1">
                <div className="font-bold text-white">{selectedInvoiceForPreview.clientName}</div>
                {selectedInvoiceForPreview.clientEmail && (
                  <div className="text-slate-400 font-mono">{selectedInvoiceForPreview.clientEmail}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="border border-slate-800 rounded-lg divide-y divide-slate-800/80">
                  {selectedInvoiceForPreview.lineItems.map((it) => (
                    <div key={it.id} className="p-2 flex items-center justify-between">
                      <div className="text-slate-200">{it.description}</div>
                      <div className="font-mono font-bold text-white tabular-nums">
                        {selectedInvoiceForPreview.currency} {it.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] text-right font-mono tabular-nums space-y-1">
                <div className="text-slate-400">
                  Subtotal: {selectedInvoiceForPreview.currency} {selectedInvoiceForPreview.subtotal.toFixed(2)}
                </div>
                <div className="text-base font-bold text-cyan-400 pt-1">
                  Total: {selectedInvoiceForPreview.currency} {selectedInvoiceForPreview.total.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPreview(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => downloadInvoicePDF(selectedInvoiceForPreview, settings)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
