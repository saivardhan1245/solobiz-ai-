import React from 'react';
import { motion } from 'motion/react';
import { HardDrive, Cpu, Sparkles, Plus } from 'lucide-react';
import { HealthData } from '../types';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  health: HealthData | null;
  onOpenUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  health,
  onOpenUpload,
}) => {
  const activeProvider = health?.activeProvider;

  const getProviderBadge = () => {
    if (!activeProvider) {
      return (
        <span className="text-xs text-slate-400 font-mono">
          Detecting Model...
        </span>
      );
    }

    if (activeProvider.id === 'deterministic') {
      return (
        <div
          className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800/60 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
          title={activeProvider.fallbackReason || 'Offline Processing (100% On-Device)'}
        >
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold font-mono">Offline Processing</span>
          <span className="text-indigo-400/80 text-[10px] font-mono">
            {health?.isHosted ? '· Hosted Default' : '· Offline'}
          </span>
        </div>
      );
    }

    if (activeProvider.type === 'local') {
      const isOk = activeProvider.health?.ok;
      return (
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
            isOk
              ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'text-amber-300 bg-amber-950/60 border-amber-800/60'
          }`}
          title={activeProvider.health?.message || 'Local Gemma via Ollama'}
        >
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold font-mono">Gemma ({activeProvider.model || 'Ollama'})</span>
          <span className="text-[10px] opacity-80 font-mono">
            {isOk ? '· On-Device' : '· Fallback to Offline'}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-800/60">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold font-mono">Gemini 3.8 Flash</span>
        <span className="text-amber-400/70 text-[10px]">· Cloud API</span>
      </div>
    );
  };

  const navItems = [
    { id: 'landing', label: 'Overview' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'upload', label: 'Receipts' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'assistant', label: 'Assistant' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#070b19]/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Brand Wordmark */}
          <button
            onClick={() => onSelectTab('landing')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(56,189,248,0.35)] group-hover:scale-105 transition-transform">
              SB
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white whitespace-nowrap font-display flex items-center gap-1.5">
                SoloBiz <span className="text-cyan-400 text-xs px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50 font-mono">AI</span>
              </span>
            </div>
          </button>

          {/* Navigation Links with animated moving indicator */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] relative">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 z-10 ${
                    isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-glow"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/25 via-indigo-500/20 to-cyan-500/10 border border-cyan-400/40 rounded-lg -z-10 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Inference Badge & Quick Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">
              {getProviderBadge()}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenUpload}
              className="relative group overflow-hidden px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 transition-all shadow-[0_0_20px_rgba(56,189,248,0.35)] whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Receipt</span>
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center overflow-x-auto py-2.5 border-t border-white/[0.06] text-xs font-medium text-slate-400 gap-2 scrollbar-none">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg border transition-all ${
                currentTab === item.id
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
