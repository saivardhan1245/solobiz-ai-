import React from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  HardDrive,
  Calculator,
  ArrowRight,
  Lock,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import { TiltCard } from './TiltCard';

interface LandingViewProps {
  onGetStarted: () => void;
  onExploreDashboard: () => void;
  onOpenSettings: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGetStarted,
  onExploreDashboard,
  onOpenSettings,
}) => {
  return (
    <div className="relative space-y-20 py-8 overflow-hidden">
      {/* Background ambient light fields */}
      <div className="pointer-events-none absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-cyan-500/15 via-indigo-600/10 to-transparent blur-3xl -z-10" />

      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center max-w-4xl mx-auto space-y-6 pt-4"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs font-mono font-medium shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span>ON-DEVICE FINANCIAL INTELLIGENCE</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-display text-balance leading-tight">
          Next-generation financial intelligence for{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(56,189,248,0.3)]">
            solo professionals.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto text-balance leading-relaxed">
          Open-weight document parsing, verified ledger arithmetic, and client invoicing—powered on-device with zero vendor lock-in.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="group relative px-6 py-3.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-xl hover:from-cyan-300 hover:to-sky-200 transition-all duration-200 shadow-[0_0_25px_rgba(56,189,248,0.4)] flex items-center gap-2"
          >
            <span>Organize your finances</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExploreDashboard}
            className="px-6 py-3.5 text-sm font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.1] rounded-xl hover:bg-white/[0.08] hover:text-white transition-all shadow-sm"
          >
            Explore the dashboard
          </motion.button>
        </div>
      </motion.section>

      {/* Floating 3D Financial Document Illustration */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl mx-auto px-4"
      >
        <div className="relative mx-auto">
          <div className="relative rounded-2xl border border-white/[0.1] bg-[#090d1f]/90 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="absolute inset-0 bg-grid-tech opacity-30" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

            <div className="relative grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>ON-DEVICE OCR & PARSER</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-display">
                  Turn noisy receipts into verified ledger entries in seconds.
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open OCR reads pixels, Gemma extracts fields, and verified code runs math. Discrepancies are flagged before touching your database.
                </p>

                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-300 font-mono">
                    Zero Cloud Leakage
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-300 font-mono">
                    Deterministic Math
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-slate-300 font-mono">
                    SQLite Ledger
                  </span>
                </div>
              </div>

              {/* Floating Holographic Document Card */}
              <div className="md:col-span-5">
                <div className="relative rounded-xl border border-cyan-500/30 bg-gradient-to-b from-[#0f172a] to-[#0a0f1e] p-4 shadow-[0_0_30px_rgba(6,182,212,0.2)] space-y-3 transform md:rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-cyan-400" />
                      <span className="font-mono text-xs font-bold text-white">ACME Cloud LLC</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                      VERIFIED
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Date</span>
                      <span className="text-slate-200">2026-10-14</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Compute Instance</span>
                      <span className="text-slate-200">$65.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tax (8.25%)</span>
                      <span className="text-slate-200">$7.88</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.08] flex justify-between font-bold text-xs text-white">
                      <span>Total Amount</span>
                      <span className="text-cyan-400 tabular-nums">$103.38 USD</span>
                    </div>
                  </div>

                  <div className="pt-1 text-[10px] text-slate-400 text-center font-mono">
                    Gemma 2b · Subtotal + Tax Invariant Checked
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 3 Core Pillars with TiltCards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        <TiltCard glowColor="rgba(6, 182, 212, 0.2)" className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <HardDrive className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Local-First Inference</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Run open-weight Gemma via Ollama on your machine. Client names, receipts, and sensitive financials never touch external servers.
          </p>
        </TiltCard>

        <TiltCard glowColor="rgba(99, 102, 241, 0.2)" className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Calculator className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Separation of AI & Math</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            LLMs extract unstructured text; application code handles calculations, taxes, currency totals, and invoice PDFs without hallucinations.
          </p>
        </TiltCard>

        <TiltCard glowColor="rgba(56, 189, 248, 0.2)" className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-display">Human Verification Loop</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every document passes through an interactive review screen. Uncertain values are flagged; records commit to SQLite only on your confirmation.
          </p>
        </TiltCard>
      </section>

      {/* Footer Callout */}
      <section className="text-center max-w-xl mx-auto px-4 space-y-3">
        <button
          onClick={onOpenSettings}
          className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Configurable model providers & local SQLite data guarantees</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </section>
    </div>
  );
};
