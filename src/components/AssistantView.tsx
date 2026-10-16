import React, { useState } from 'react';
import {
  Send,
  Bot,
  FileText,
  Receipt,
  Sparkles,
  HardDrive,
  Cpu,
  CornerDownRight,
} from 'lucide-react';
import { AssistantAnswer, ExpenseRecord, InvoiceRecord } from '../types';
import { askAssistant } from '../api';

interface AssistantViewProps {
  expenses: ExpenseRecord[];
  invoices: InvoiceRecord[];
}

export const AssistantView: React.FC<AssistantViewProps> = ({ expenses, invoices }) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<
    Array<{
      question: string;
      answer: AssistantAnswer;
      timestamp: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const sampleQuestions = [
    'Which invoices remain unpaid?',
    'Show my expenses by category',
    'What are my total recent expenses?',
    'What was spent on software and subscriptions?',
  ];

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || question).trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await askAssistant(q);
      setConversation((prev) => [
        {
          question: q,
          answer: response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
      setQuestion('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getCitedExpense = (id: string) => expenses.find((e) => e.id === id);
  const getCitedInvoice = (id: string) => invoices.find((inv) => inv.id === id);

  return (
    <div className="space-y-6 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-white/[0.08]">
        <div className="text-xs font-mono text-cyan-400">GROUNDED INTELLIGENCE</div>
        <h1 className="text-2xl font-black tracking-tight text-white font-display mt-0.5">
          Financial Assistant
        </h1>
      </div>

      {/* Query Bar */}
      <div className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-4 shadow-xs space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Query expenses, unpaid invoices, or category totals..."
            className="flex-1 p-2.5 text-xs rounded-lg border border-slate-700 bg-[#070b18] text-white focus:outline-none focus:border-cyan-500 font-mono"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] flex items-center gap-1.5 shrink-0"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] text-slate-400 font-mono">Suggested:</span>
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAsk(sq)}
              className="text-[11px] font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white px-2.5 py-1 rounded-md border border-white/[0.06] transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 font-mono">
          {error}
        </div>
      )}

      {/* History */}
      <div className="space-y-4">
        {conversation.length === 0 && (
          <div className="p-10 rounded-xl border border-white/[0.08] bg-slate-900/30 backdrop-blur-md text-center space-y-3">
            <Bot className="w-8 h-8 text-cyan-400 mx-auto" />
            <h3 className="text-sm font-bold text-white font-display">Grounded in Saved Records</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Query your <strong className="text-slate-200">{expenses.length} expense(s)</strong> and{' '}
              <strong className="text-slate-200">{invoices.length} invoice(s)</strong>. If records do not contain the answer, the assistant states it transparently.
            </p>
          </div>
        )}

        {conversation.map((entry, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-5 space-y-4 shadow-sm"
          >
            {/* User Query */}
            <div className="flex items-start justify-between gap-3 text-xs">
              <div className="font-bold text-white text-sm">{entry.question}</div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">{entry.timestamp}</span>
            </div>

            {/* Answer */}
            <div className="p-4 rounded-lg bg-[#070b18] text-xs text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-800 font-sans">
              {entry.answer.answer}
            </div>

            {/* Evidence Chips */}
            {(entry.answer.citedExpenseIds?.length > 0 || entry.answer.citedInvoiceIds?.length > 0) && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 font-bold">
                  <CornerDownRight className="w-3.5 h-3.5" />
                  <span>Cited Ledger Records:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {entry.answer.citedExpenseIds?.map((id) => {
                    const exp = getCitedExpense(id);
                    if (!exp) return null;
                    return (
                      <div
                        key={id}
                        className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-semibold text-white truncate max-w-[140px]">
                            {exp.merchant}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">({exp.date})</span>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-cyan-300">
                          {exp.currency} {exp.total.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}

                  {entry.answer.citedInvoiceIds?.map((id) => {
                    const inv = getCitedInvoice(id);
                    if (!inv) return null;
                    return (
                      <div
                        key={id}
                        className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-white">
                            #{inv.invoiceNumber}
                          </span>
                          <span className="text-slate-400">({inv.clientName})</span>
                        </div>
                        <span className="font-mono tabular-nums font-bold text-indigo-300">
                          {inv.currency} {inv.total.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inference Model footnote */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
              <span className="flex items-center gap-1.5">
                {entry.answer.inferenceMode === 'local' ? (
                  <HardDrive className="w-3 h-3 text-cyan-400" />
                ) : entry.answer.inferenceMode === 'deterministic' ? (
                  <Cpu className="w-3 h-3 text-indigo-400" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-400" />
                )}
                <span>{entry.answer.modelUsed}</span>
              </span>
              <span>Grounded in SQLite</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
