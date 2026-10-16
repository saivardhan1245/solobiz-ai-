import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUpRight,
  Receipt,
  FileText,
  Bot,
  Plus,
  AlertCircle,
  Wallet,
  X,
  CreditCard,
  PieChart,
} from 'lucide-react';
import { SummaryData } from '../types';
import { MotionNumber } from './MotionNumber';
import { TiltCard } from './TiltCard';

interface DashboardViewProps {
  summary: SummaryData | null;
  defaultCurrency?: string;
  onNavigate: (tab: string) => void;
  onOpenUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  defaultCurrency = 'USD',
  onNavigate,
  onOpenUpload,
}) => {
  const [expandedMetric, setExpandedMetric] = useState<'income' | 'receivables' | 'expenses' | 'cashflow' | null>(null);

  const hasExpenses = (summary?.totalExpenseRecords || 0) > 0;
  const hasInvoices = (summary?.totalInvoiceRecords || 0) > 0;
  const isEmpty = !hasExpenses && !hasInvoices;

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const primaryCurrency =
    Object.keys(summary?.confirmedIncomeByCurrency || {})[0] ||
    Object.keys(summary?.expensesByCurrency || {})[0] ||
    defaultCurrency ||
    'USD';

  const confirmedIncome = summary?.confirmedIncomeByCurrency[primaryCurrency] || 0;
  const outstanding = summary?.outstandingByCurrency[primaryCurrency] || 0;
  const totalExpenses = summary?.expensesByCurrency[primaryCurrency] || 0;
  const netCashflow = Math.round((confirmedIncome - totalExpenses) * 100) / 100;

  // Stagger variants for cinematic entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 py-4"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span>COMMAND CENTER</span>
            <span>·</span>
            <span className="text-slate-400">{todayStr}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-display mt-0.5">
            Executive Ledger
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('invoices')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/[0.05] border border-white/[0.1] rounded-lg hover:bg-white/[0.08] hover:text-white transition-all shadow-sm cursor-pointer"
          >
            Create Invoice
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenUpload}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Receipt</span>
          </motion.button>
        </div>
      </motion.div>

      {/* 4 Key Executive Financial Metric Cards (Always displayed cleanly) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Confirmed Income */}
        <TiltCard
          glowColor="rgba(16, 185, 129, 0.18)"
          onClick={() => setExpandedMetric('income')}
          className="p-5 space-y-2 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Confirmed Income</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-display">
            <MotionNumber value={confirmedIncome} currency={primaryCurrency} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>{hasInvoices ? 'Paid invoices' : '0 paid invoices'}</span>
            <span className="text-emerald-400 group-hover:underline">Details →</span>
          </div>
        </TiltCard>

        {/* 2. Outstanding Receivables */}
        <TiltCard
          glowColor="rgba(245, 158, 11, 0.18)"
          onClick={() => setExpandedMetric('receivables')}
          className="p-5 space-y-2 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Receivables</span>
            <div className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-display">
            <MotionNumber value={outstanding} currency={primaryCurrency} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Pending remittance</span>
            <span className="text-amber-400 group-hover:underline">Details →</span>
          </div>
        </TiltCard>

        {/* 3. Total Expenses */}
        <TiltCard
          glowColor="rgba(239, 68, 68, 0.18)"
          onClick={() => setExpandedMetric('expenses')}
          className="p-5 space-y-2 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Verified Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-display">
            <MotionNumber value={totalExpenses} currency={primaryCurrency} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>{summary?.totalExpenseRecords || 0} receipts</span>
            <span className="text-rose-400 group-hover:underline">Details →</span>
          </div>
        </TiltCard>

        {/* 4. Net Operating Cashflow */}
        <TiltCard
          glowColor="rgba(56, 189, 248, 0.18)"
          onClick={() => setExpandedMetric('cashflow')}
          className="p-5 space-y-2 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Net Cashflow</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`text-2xl font-black font-display ${netCashflow >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
            <MotionNumber value={netCashflow} currency={primaryCurrency} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Income − Expenses</span>
            <span className="text-cyan-400 group-hover:underline">Details →</span>
          </div>
        </TiltCard>
      </motion.div>

      {/* When Ledger is completely empty, show guidance card */}
      {isEmpty && (
        <motion.div variants={itemVariants}>
          <TiltCard glowColor="rgba(56, 189, 248, 0.15)" className="p-10 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white font-display">Your ledger is ready</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              SoloBiz AI computes financial metrics strictly from verified records. Upload a business receipt or issue an invoice to populate your live balances.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={onOpenUpload}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] cursor-pointer"
              >
                Upload Receipt
              </button>
              <button
                onClick={() => onNavigate('invoices')}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer"
              >
                Create Invoice
              </button>
            </div>
          </TiltCard>
        </motion.div>
      )}


      {/* Main Command Workspace */}
      {!isEmpty && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Dual Ledger Grid: Recent Expenses & Recent Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Verified Expenses (Left 6 cols) */}
            <div className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white font-display">Recent Expenses</h2>
                  <span className="text-[11px] text-slate-400 font-mono">SQLite verified records</span>
                </div>
                <button
                  onClick={() => onNavigate('expenses')}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
                >
                  <span>All ({summary?.totalExpenseRecords || 0})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {summary?.recentExpenses && summary.recentExpenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-400 font-mono text-[11px]">
                        <th className="pb-2.5 font-normal">Date</th>
                        <th className="pb-2.5 font-normal">Merchant</th>
                        <th className="pb-2.5 font-normal">Category</th>
                        <th className="pb-2.5 font-normal text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {summary.recentExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-white/[0.03] transition-colors group">
                          <td className="py-2.5 font-mono text-slate-400 whitespace-nowrap">{exp.date}</td>
                          <td className="py-2.5 font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[140px]">
                            {exp.merchant}
                          </td>
                          <td className="py-2.5 text-slate-400 text-[11px] truncate max-w-[110px]">{exp.category}</td>
                          <td className="py-2.5 font-mono tabular-nums font-bold text-right text-white whitespace-nowrap">
                            {exp.currency} {exp.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-white/[0.08] rounded-xl text-center space-y-2">
                  <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">No expenses logged yet.</p>
                  <button
                    onClick={onOpenUpload}
                    className="text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    + Scan first receipt
                  </button>
                </div>
              )}
            </div>

            {/* Invoices & Receivables (Right 6 cols) */}
            <div className="lg:col-span-6 rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white font-display">Invoices & Receivables</h2>
                  <span className="text-[11px] text-slate-400 font-mono">Billing & payment tracking</span>
                </div>
                <button
                  onClick={() => onNavigate('invoices')}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
                >
                  <span>All ({summary?.totalInvoiceRecords || 0})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {summary?.recentInvoices && summary.recentInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-400 font-mono text-[11px]">
                        <th className="pb-2.5 font-normal">Invoice #</th>
                        <th className="pb-2.5 font-normal">Client</th>
                        <th className="pb-2.5 font-normal">Status</th>
                        <th className="pb-2.5 font-normal text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {summary.recentInvoices.map((inv) => {
                        const statusColors: Record<string, string> = {
                          paid: 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300',
                          sent: 'bg-amber-950/80 border-amber-800/60 text-amber-300',
                          draft: 'bg-slate-800/80 border-slate-700/60 text-slate-300',
                          overdue: 'bg-rose-950/80 border-rose-800/60 text-rose-300',
                        };
                        return (
                          <tr key={inv.id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="py-2.5 font-mono font-semibold text-cyan-300 whitespace-nowrap">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 text-white truncate max-w-[140px] font-medium">
                              {inv.clientName}
                            </td>
                            <td className="py-2.5 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                                  statusColors[inv.status] || 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono tabular-nums font-bold text-right text-white whitespace-nowrap">
                              {inv.currency} {inv.total.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-white/[0.08] rounded-xl text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-mono">No invoices created yet.</p>
                  <button
                    onClick={() => onNavigate('invoices')}
                    className="text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    + Generate client invoice
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Row: Category Split & AI Assistant Callout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Split (5 cols) */}
            <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white font-display">Category Distribution</h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  {Object.keys(summary?.expensesByCategory || {}).length} categories
                </span>
              </div>

              {Object.keys(summary?.expensesByCategory || {}).length > 0 ? (
                <div className="space-y-3.5">
                  {Object.entries(summary!.expensesByCategory).map(([cat, amt]) => {
                    const totalSum = Object.values(summary!.expensesByCategory).reduce((a, b) => a + b, 0);
                    const percentage = totalSum > 0 ? Math.round((amt / totalSum) * 100) : 0;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 truncate max-w-[180px]">{cat}</span>
                          <span className="font-mono tabular-nums font-bold text-white">
                            {amt.toFixed(2)} <span className="text-slate-500 text-[10px]">({percentage}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 font-mono">No categorized expenses saved yet.</p>
              )}
            </div>

            {/* Record-Grounded Assistant Callout (7 cols) */}
            <div className="lg:col-span-7 relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-indigo-950/30 to-slate-900/70 p-5 backdrop-blur-md flex flex-col justify-between shadow-[0_0_25px_rgba(6,182,212,0.1)] space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white font-display">Grounded Financial Assistant</h4>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                      Zero Hallucination
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Query your live SQLite ledger with conversational ease. Answers reference exact receipt and invoice IDs with verified mathematical certainty.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
                <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                  <span className="bg-white/[0.04] px-2 py-1 rounded border border-white/[0.06]">"Unpaid invoices?"</span>
                  <span className="bg-white/[0.04] px-2 py-1 rounded border border-white/[0.06]">"Total software costs?"</span>
                </div>
                <button
                  onClick={() => onNavigate('assistant')}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] whitespace-nowrap"
                >
                  Launch Assistant →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Spring-Expanded Metric Detail Modal */}
      <AnimatePresence>
        {expandedMetric && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="rounded-2xl border border-white/[0.12] bg-[#090d1f] max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                    <PieChart className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-white font-display capitalize">
                    {expandedMetric} Breakdown
                  </h3>
                </div>
                <button
                  onClick={() => setExpandedMetric(null)}
                  className="text-xs text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {expandedMetric === 'income' && (
                  <div className="space-y-2">
                    <p className="text-slate-400">Paid client invoices:</p>
                    <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-1">
                      {Object.entries(summary?.confirmedIncomeByCurrency || {}).map(([curr, amt]) => (
                        <div key={curr} className="flex justify-between font-mono">
                          <span className="text-slate-400">{curr} Total</span>
                          <span className="font-bold text-white">{amt.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expandedMetric === 'receivables' && (
                  <div className="space-y-2">
                    <p className="text-slate-400">Outstanding client invoices:</p>
                    <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-1">
                      {Object.entries(summary?.outstandingByCurrency || {}).map(([curr, amt]) => (
                        <div key={curr} className="flex justify-between font-mono">
                          <span className="text-slate-400">{curr} Outstanding</span>
                          <span className="font-bold text-amber-400">{amt.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expandedMetric === 'expenses' && (
                  <div className="space-y-2">
                    <p className="text-slate-400">Total verified expenses:</p>
                    <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-1">
                      {Object.entries(summary?.expensesByCurrency || {}).map(([curr, amt]) => (
                        <div key={curr} className="flex justify-between font-mono">
                          <span className="text-slate-400">{curr} Expenses</span>
                          <span className="font-bold text-rose-400">{amt.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expandedMetric === 'cashflow' && (
                  <div className="space-y-2">
                    <p className="text-slate-400">Net operating balance ({primaryCurrency}):</p>
                    <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-2 font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Total Income:</span>
                        <span className="text-emerald-400">+{confirmedIncome.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Total Expenses:</span>
                        <span className="text-rose-400">−{totalExpenses.toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t border-white/[0.08] flex justify-between font-bold text-sm text-white">
                        <span>Net Cashflow:</span>
                        <span className={netCashflow >= 0 ? 'text-cyan-300' : 'text-rose-400'}>
                          {netCashflow.toFixed(2)} {primaryCurrency}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex justify-end">
                <button
                  onClick={() => setExpandedMetric(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-white/[0.05] rounded-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
