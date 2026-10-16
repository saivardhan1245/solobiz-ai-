import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Trash2,
  Edit2,
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ExpenseRecord, CurrencyCode } from '../types';
import { updateExpense, deleteExpense } from '../api';

interface ExpenseListViewProps {
  expenses: ExpenseRecord[];
  onRefresh: () => void;
  onOpenUpload: () => void;
}

export const ExpenseListView: React.FC<ExpenseListViewProps> = ({
  expenses,
  onRefresh,
  onOpenUpload,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit form state
  const [editMerchant, setEditMerchant] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>('USD');
  const [editTotal, setEditTotal] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  const currencies = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.currency));
    return Array.from(set);
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.sourceDocumentName && e.sourceDocumentName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = selectedCategory === 'all' || e.category === selectedCategory;
      const matchCurrency = selectedCurrency === 'all' || e.currency === selectedCurrency;

      return matchSearch && matchCategory && matchCurrency;
    });
  }, [expenses, searchTerm, selectedCategory, selectedCurrency]);

  const currencyTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      map[e.currency] = (map[e.currency] || 0) + e.total;
    });
    return map;
  }, [filtered]);

  const formatCurrencyLabel = (curr: string, amt: number) => {
    if (curr === 'INR') return `₹${amt.toFixed(2)}`;
    if (curr === 'USD') return `$${amt.toFixed(2)}`;
    if (curr === 'EUR') return `€${amt.toFixed(2)}`;
    if (curr === 'GBP') return `£${amt.toFixed(2)}`;
    return `${curr} ${amt.toFixed(2)}`;
  };

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleConfirmDelete = async (id: string, merchantName: string) => {
    setIsDeleting(true);
    try {
      await deleteExpense(id);
      setDeletingId(null);
      showFeedback(`Expense from "${merchantName}" successfully removed from ledger.`);
      onRefresh();
    } catch (err) {
      showFeedback(`Failed to delete expense: ${err instanceof Error ? err.message : String(err)}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setEditMerchant(exp.merchant);
    setEditDate(exp.date);
    setEditCurrency(exp.currency || 'USD');
    setEditTotal(exp.total.toString());
    setEditCategory(exp.category);
    setEditNotes(exp.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;
    const tot = parseFloat(editTotal);
    if (isNaN(tot) || tot <= 0) {
      setEditError('Please enter a valid positive total amount.');
      return;
    }
    if (!editMerchant.trim()) {
      setEditError('Merchant name is required.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);
    try {
      await updateExpense(editingExpense.id, {
        merchant: editMerchant.trim(),
        date: editDate,
        currency: editCurrency,
        total: tot,
        category: editCategory,
        notes: editNotes.trim() || undefined,
        extractionStatus: 'manual',
      });
      setEditingExpense(null);
      showFeedback('Expense record updated successfully.');
      onRefresh();
    } catch (err) {
      setEditError(`Failed to update expense: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-cyan-400">VERIFIED RECORDS</div>
          <h1 className="text-2xl font-black tracking-tight text-white font-display mt-0.5">
            Expense Ledger
          </h1>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onOpenUpload}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Receipt</span>
        </motion.button>
      </div>

      {/* In-app Notification / Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-200'
                : 'bg-rose-950/70 border-rose-800/80 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-white/[0.08] backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search merchant, notes, or filename..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-[#070b18] text-white focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-slate-700 bg-[#070b18] text-slate-300 focus:outline-none"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Currency Filter */}
          {currencies.length > 0 && (
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="text-xs p-1.5 rounded-lg border border-slate-700 bg-[#070b18] text-slate-300 focus:outline-none"
            >
              <option value="all">All Currencies ({currencies.length})</option>
              {currencies.map((curr) => (
                <option key={curr} value={curr}>
                  {curr === 'INR' ? 'INR (₹)' : curr}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Currency Totals */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Total:</span>
          {Object.entries(currencyTotals).length > 0 ? (
            Object.entries(currencyTotals).map(([curr, sum]) => (
              <span
                key={curr}
                className="font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-1 rounded-md"
              >
                {formatCurrencyLabel(curr, sum)}
              </span>
            ))
          ) : (
            <span className="text-slate-400">0.00</span>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center space-y-3 bg-slate-900/20">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No matching expenses found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {expenses.length === 0
              ? 'Your ledger is currently empty. Upload receipts or invoices to populate records.'
              : 'Try clearing your search or category filter to reveal more records.'}
          </p>
          {expenses.length === 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenUpload}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-sm"
            >
              Upload First Receipt
            </motion.button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-4 font-normal">Date</th>
                  <th className="py-3 px-4 font-normal">Merchant</th>
                  <th className="py-3 px-4 font-normal">Category</th>
                  <th className="py-3 px-4 font-normal">Source Document</th>
                  <th className="py-3 px-4 font-normal text-right">Subtotal</th>
                  <th className="py-3 px-4 font-normal text-right">Tax</th>
                  <th className="py-3 px-4 font-normal text-right">Total</th>
                  <th className="py-3 px-4 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-white max-w-[200px]">
                      <div className="truncate font-semibold">{exp.merchant}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-400 truncate">{exp.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {exp.category}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {exp.sourceDocumentName ? (
                        <span className="truncate max-w-[130px] inline-block" title={exp.sourceDocumentName}>
                          {exp.sourceDocumentName}
                        </span>
                      ) : (
                        <span>Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-400 whitespace-nowrap">
                      {exp.subtotal !== null ? formatCurrencyLabel(exp.currency, exp.subtotal) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-right text-slate-400 whitespace-nowrap">
                      {exp.tax !== null ? formatCurrencyLabel(exp.currency, exp.tax) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-bold text-right text-white whitespace-nowrap">
                      {formatCurrencyLabel(exp.currency, exp.total)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {deletingId === exp.id ? (
                        /* Robust Inline Delete Confirmation (Works in any iframe without browser confirm dialogs) */
                        <div className="flex items-center justify-end gap-1.5 animate-in fade-in duration-150">
                          <span className="text-[11px] text-rose-300 font-medium">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmDelete(exp.id, exp.merchant)}
                            disabled={isDeleting}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-md transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            disabled={isDeleting}
                            className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-md transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(exp)}
                            title="Edit Expense"
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-white/[0.05] rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(exp.id)}
                            title="Delete Expense"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
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

      {/* Spring Modal for Editing Expense */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="rounded-2xl border border-white/[0.12] bg-[#090d1f] max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-sm font-bold text-white font-display">
                  Edit Verified Expense
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="text-xs text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Merchant</label>
                  <input
                    type="text"
                    value={editMerchant}
                    onChange={(e) => setEditMerchant(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Currency</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value as CurrencyCode)}
                      className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-semibold focus:outline-none focus:border-cyan-500"
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

                  <div className="space-y-1 col-span-2">
                    <label className="font-semibold text-slate-300">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Total Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTotal}
                    onChange={(e) => setEditTotal(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Software & Subscriptions">Software & Subscriptions</option>
                    <option value="Equipment & Hardware">Equipment & Hardware</option>
                    <option value="Meals & Entertainment">Meals & Entertainment</option>
                    <option value="Travel & Transportation">Travel & Transportation</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Optional details or context..."
                    className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
