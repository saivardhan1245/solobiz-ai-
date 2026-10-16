import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { UploadVerifyView } from './components/UploadVerifyView';
import { ExpenseListView } from './components/ExpenseListView';
import { InvoiceBuilderView } from './components/InvoiceBuilderView';
import { AssistantView } from './components/AssistantView';
import { SettingsView } from './components/SettingsView';
import {
  fetchHealth,
  fetchSettings,
  fetchSummary,
  fetchExpenses,
  fetchInvoices,
} from './api';
import {
  HealthData,
  AppSettings,
  SummaryData,
  ExpenseRecord,
  InvoiceRecord,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const isHostedBrowser = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  const [health, setHealth] = useState<HealthData | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    modelProvider: isHostedBrowser ? 'deterministic' : 'ollama',
    ollamaEndpoint: 'http://127.0.0.1:11434',
    ollamaModel: 'gemma2:2b',
    businessName: '',
    businessEmail: '',
    businessCurrency: 'USD',
    businessTaxId: '',
    businessAddress: '',
  });
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [healthData, settingsData, summaryData, expensesData, invoicesData] =
        await Promise.all([
          fetchHealth().catch(() => null),
          fetchSettings().catch(() => null),
          fetchSummary().catch(() => null),
          fetchExpenses().catch(() => []),
          fetchInvoices().catch(() => []),
        ]);

      if (healthData) setHealth(healthData);
      if (settingsData?.settings) setSettings(settingsData.settings);
      if (summaryData) setSummary(summaryData);
      setExpenses(expensesData);
      setInvoices(invoicesData);
    } catch (err) {
      console.warn('Error loading app data:', err);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleExpenseSaved = (newExpense: ExpenseRecord) => {
    showNotification(`Expense from ${newExpense.merchant} (${newExpense.currency} ${newExpense.total.toFixed(2)}) committed to ledger!`);
    loadAllData();
    setCurrentTab('expenses');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050814] text-slate-100 font-sans selection:bg-cyan-400 selection:text-slate-950 relative overflow-x-hidden">
      {/* Ambient background glow fields */}
      <div className="pointer-events-none fixed inset-0 bg-radial-vignette -z-10 opacity-70" />
      <div className="pointer-events-none fixed top-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[128px] -z-10" />
      <div className="pointer-events-none fixed bottom-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] -z-10" />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#090d1f] text-white text-xs font-mono px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-2.5 border border-cyan-500/40">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        health={health}
        onOpenUpload={() => setCurrentTab('upload')}
      />

      {/* Main View Container with Cinematic Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            {currentTab === 'landing' && (
              <LandingView
                onGetStarted={() => setCurrentTab('upload')}
                onExploreDashboard={() => setCurrentTab('dashboard')}
                onOpenSettings={() => setCurrentTab('settings')}
              />
            )}

            {currentTab === 'dashboard' && (
              <DashboardView
                summary={summary}
                defaultCurrency={settings.businessCurrency || 'USD'}
                onNavigate={setCurrentTab}
                onOpenUpload={() => setCurrentTab('upload')}
              />
            )}

            {currentTab === 'upload' && (
              <UploadVerifyView
                onSaved={handleExpenseSaved}
                onNavigateToExpenses={() => setCurrentTab('expenses')}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpenseListView
                expenses={expenses}
                onRefresh={loadAllData}
                onOpenUpload={() => setCurrentTab('upload')}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoiceBuilderView
                invoices={invoices}
                settings={settings}
                onRefresh={loadAllData}
              />
            )}

            {currentTab === 'assistant' && (
              <AssistantView expenses={expenses} invoices={invoices} />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                health={health}
                onRefreshAll={loadAllData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Futuristic Minimal Footer */}
      <footer className="border-t border-white/[0.06] bg-[#030610]/80 py-5 mt-16 text-xs text-slate-500 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-display">SoloBiz AI</span>
            <span>· On-Device Financial Intelligence</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>SQLite Local Ledger</span>
            <span>·</span>
            <span>Gemma Inference Engine</span>
            <span>·</span>
            <button
              onClick={() => setCurrentTab('settings')}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Privacy & Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
