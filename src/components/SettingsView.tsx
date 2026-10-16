import React, { useState } from 'react';
import {
  HardDrive,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Trash2,
  Building,
  Save,
  ChevronDown,
  ChevronUp,
  Sliders,
  Activity,
} from 'lucide-react';
import { AppSettings, HealthData, ModelProviderType } from '../types';
import { saveSettings, testProvider, resetDatabase, fetchExpenses, fetchInvoices } from '../api';

interface SettingsViewProps {
  settings: AppSettings;
  health: HealthData | null;
  onRefreshAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  health,
  onRefreshAll,
}) => {
  const [activeProvider, setActiveProvider] = useState<ModelProviderType>(settings.modelProvider);
  const [ollamaEndpoint, setOllamaEndpoint] = useState(settings.ollamaEndpoint);
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaModel);

  // Business profile
  const [bizName, setBizName] = useState(settings.businessName);
  const [bizEmail, setBizEmail] = useState(settings.businessEmail);
  const [bizCurrency, setBizCurrency] = useState(settings.businessCurrency);
  const [bizTaxId, setBizTaxId] = useState(settings.businessTaxId);
  const [bizAddress, setBizAddress] = useState(settings.businessAddress);

  // Advanced section collapsible toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Status & feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testingTarget, setTestingTarget] = useState<string | null>(null);

  const handleTestSpecificProvider = async (providerId: ModelProviderType) => {
    setIsTesting(true);
    setTestingTarget(providerId);
    setTestResult(null);
    try {
      const res = await testProvider(providerId, ollamaEndpoint, ollamaModel);
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : String(err),
        latencyMs: 0,
      });
    } finally {
      setIsTesting(false);
      setTestingTarget(null);
    }
  };

  const handleCheckActiveConnection = async () => {
    await handleTestSpecificProvider(activeProvider);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await saveSettings({
        modelProvider: activeProvider,
        ollamaEndpoint,
        ollamaModel,
        businessName: bizName,
        businessEmail: bizEmail,
        businessCurrency: bizCurrency,
        businessTaxId: bizTaxId,
        businessAddress: bizAddress,
      });
      setSaveSuccess(true);
      onRefreshAll();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const [expenses, invoices] = await Promise.all([fetchExpenses(), fetchInvoices()]);
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        settings,
        expenses,
        invoices,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solobiz_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const executeResetDatabase = async () => {
    setIsResetting(true);
    try {
      await resetDatabase();
      onRefreshAll();
      setConfirmReset(false);
      setResetMessage('Database successfully reset to empty state.');
      setTimeout(() => setResetMessage(null), 4000);
    } catch (err) {
      setResetMessage(`Reset failed: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setResetMessage(null), 4000);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-8 py-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-white/[0.08]">
        <div className="text-xs font-mono text-cyan-400">PREFERENCES & PROFILE</div>
        <h1 className="text-2xl font-black tracking-tight text-white font-display mt-0.5">
          Settings
        </h1>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* AI Preferences */}
        <section className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-display">AI Preferences</h2>
                {health?.isHosted ? (
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 font-semibold">
                    Hosted Environment
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-semibold">
                    Local Environment
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose how SoloBiz AI processes documents and calculates totals.
              </p>
            </div>

            {/* Check Connection Quick Action */}
            <button
              type="button"
              onClick={handleCheckActiveConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-900/50 transition-colors font-medium text-xs font-mono shrink-0"
            >
              {isTesting && testingTarget === activeProvider ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5" />
              )}
              <span>Check Connection</span>
            </button>
          </div>

          {/* Hosted Default Notice */}
          {health?.activeProvider?.isFallback && (
            <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-slate-900/60 to-cyan-950/40 text-xs font-mono flex items-start gap-2.5">
              <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Offline Processing Active (Hosted Default)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Local Ollama is unavailable in hosted deployments. SoloBiz AI automatically defaults to safe, on-device Offline Processing with zero external dependencies. Cloud AI is never activated without explicit consent.
                </p>
              </div>
            </div>
          )}

          {/* Test connection banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800/80 text-amber-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold">
                  {testResult.ok ? 'Connection Verified' : 'Attention Required'} ({testResult.latencyMs}ms)
                </div>
                <div className="mt-0.5 text-[11px]">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Local Gemma */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative flex flex-col justify-between ${
                activeProvider === 'ollama'
                  ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                  : 'border-slate-800 hover:border-slate-700 bg-[#070b18]'
              }`}
            >
              <input
                type="radio"
                name="modelProvider"
                value="ollama"
                checked={activeProvider === 'ollama'}
                onChange={() => setActiveProvider('ollama')}
                className="hidden"
              />
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="font-bold text-white text-sm">Gemma (Local)</div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Open-weight AI running on your machine via Ollama. 100% on-device privacy.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 self-start mt-2">
                {!health?.isHosted ? 'RECOMMENDED (LOCAL)' : 'LOCAL OLLAMA'}
              </span>
            </label>

            {/* 2. Offline Processing (formerly Deterministic Parser) */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative flex flex-col justify-between ${
                activeProvider === 'deterministic'
                  ? 'border-indigo-400 bg-indigo-950/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                  : 'border-slate-800 hover:border-slate-700 bg-[#070b18]'
              }`}
            >
              <input
                type="radio"
                name="modelProvider"
                value="deterministic"
                checked={activeProvider === 'deterministic'}
                onChange={() => setActiveProvider('deterministic')}
                className="hidden"
              />
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="font-bold text-white text-sm">Offline Processing</div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Fast rule-based extraction. 100% offline with zero dependencies. Active default when Ollama is offline.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 self-start mt-2">
                {health?.isHosted ? 'HOSTED DEFAULT' : 'OFFLINE'}
              </span>
            </label>

            {/* 3. Gemini Cloud */}
            <label
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all space-y-2 relative flex flex-col justify-between ${
                activeProvider === 'gemini'
                  ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'border-slate-800 hover:border-slate-700 bg-[#070b18]'
              }`}
            >
              <input
                type="radio"
                name="modelProvider"
                value="gemini"
                checked={activeProvider === 'gemini'}
                onChange={() => setActiveProvider('gemini')}
                className="hidden"
              />
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="font-bold text-white text-sm">Gemini 3.8 Flash</div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Google Cloud model. Explicit opt-in only. Never activated silently without your selection.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 self-start mt-2">
                REMOTE CLOUD
              </span>
            </label>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
            <span className="text-slate-400">Quick presets:</span>
            <button
              type="button"
              onClick={() => {
                setActiveProvider('deterministic');
                setSaveSuccess(false);
              }}
              className="px-2.5 py-1 rounded bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/60 transition-colors"
            >
              Use Offline Processing (Hosted default)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveProvider('ollama');
                setOllamaEndpoint('http://127.0.0.1:11434');
                setOllamaModel('gemma2:2b');
                setSaveSuccess(false);
              }}
              className="px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60 transition-colors"
            >
              Use Local Gemma (127.0.0.1:11434)
            </button>
          </div>

          {/* Ollama Endpoint config */}
          {activeProvider === 'ollama' && (
            <div className="p-4 bg-[#070b18] rounded-xl border border-slate-800 space-y-3 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="font-bold text-white text-xs">Local Gemma via Ollama Configuration</span>
                <span className="text-[11px] text-cyan-400">
                  Terminal command: <code className="bg-cyan-950 px-1.5 py-0.5 rounded text-white">ollama run gemma2:2b</code>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Endpoint URL</label>
                  <input
                    type="text"
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-black text-cyan-400 text-xs"
                    placeholder="http://127.0.0.1:11434"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Model Name</label>
                  <input
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full p-2 border border-slate-700 rounded-lg bg-black text-cyan-400 text-xs"
                    placeholder="gemma2:2b"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Tip: When Ollama is not running or unreachable, SoloBiz AI automatically defaults to safe Offline Processing. It never silently switches to cloud AI.
              </p>
            </div>
          )}
        </section>

        {/* Business / Freelancer Profile */}
        <section className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white font-display">Freelancer Profile</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Business / Freelancer Name</label>
              <input
                type="text"
                value={bizName}
                placeholder="e.g. Apex Digital Consulting"
                onChange={(e) => setBizName(e.target.value)}
                className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Contact Email</label>
              <input
                type="email"
                value={bizEmail}
                placeholder="hello@apexdigital.com"
                onChange={(e) => setBizEmail(e.target.value)}
                className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Default Currency</label>
              <select
                value={bizCurrency}
                onChange={(e) => setBizCurrency(e.target.value)}
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
              <label className="font-semibold text-slate-300">Tax ID / VAT #</label>
              <input
                type="text"
                value={bizTaxId}
                placeholder="e.g. US-882910394"
                onChange={(e) => setBizTaxId(e.target.value)}
                className="w-full p-2 border border-slate-700 rounded-lg bg-[#070b18] text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Configuration saved</span>
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 disabled:opacity-50 transition-all shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </section>

        {/* Settings -> Advanced (Diagnostics, Provider Testing Tools, Infrastructure) */}
        <section className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-6 text-left flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-cyan-400">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-display">Advanced Diagnostics</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Provider connection tests, system diagnostics, and developer configuration.
                </p>
              </div>
            </div>
            <div className="text-slate-400">
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 pt-2 border-t border-white/[0.06] space-y-5 font-mono text-xs">
              {/* Provider Testing Tools */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 text-xs">Model Provider Diagnostics</span>
                  <span className="text-[11px] text-slate-400">Test both modes individually</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTestSpecificProvider('deterministic')}
                    disabled={isTesting}
                    className="p-3 rounded-lg border border-indigo-800/60 bg-indigo-950/40 text-indigo-300 hover:text-white hover:bg-indigo-900/50 transition-colors text-left space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Offline Processing</span>
                      {isTesting && testingTarget === 'deterministic' && (
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">Test deterministic parser & math invariants</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestSpecificProvider('ollama')}
                    disabled={isTesting}
                    className="p-3 rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 hover:text-white hover:bg-cyan-900/50 transition-colors text-left space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Local Gemma (Ollama)</span>
                      {isTesting && testingTarget === 'ollama' && (
                        <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">Test HTTP reachability at {ollamaEndpoint}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestSpecificProvider('gemini')}
                    disabled={isTesting}
                    className="p-3 rounded-lg border border-amber-800/60 bg-amber-950/40 text-amber-300 hover:text-white hover:bg-amber-900/50 transition-colors text-left space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Gemini 3.8 Flash</span>
                      {isTesting && testingTarget === 'gemini' && (
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">Test Google Cloud remote API connection</p>
                  </button>
                </div>
              </div>

              {/* System Environment Details */}
              <div className="p-4 rounded-lg bg-[#070b18] border border-slate-800 space-y-2 text-[11px]">
                <span className="font-bold text-slate-300 block mb-1">Runtime Status</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                  <div>
                    Environment:{' '}
                    <span className="text-white font-semibold">
                      {health?.isHosted ? 'Hosted Container (Cloud)' : 'Local Machine (Development)'}
                    </span>
                  </div>
                  <div>
                    Active Provider:{' '}
                    <span className="text-cyan-400 font-semibold">{health?.activeProvider?.name}</span>
                  </div>
                  <div>
                    Fallback Protection:{' '}
                    <span className="text-emerald-400 font-semibold">
                      {health?.activeProvider?.isFallback ? 'Active (Ollama unavailable)' : 'Standby'}
                    </span>
                  </div>
                  <div>
                    Database Engine:{' '}
                    <span className="text-white font-semibold">SQLite 3 (WASM/FS)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </form>

      {/* Backup & Data Reset */}
      <section className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-6 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-white font-display">Data Portability</h2>
        <p className="text-xs text-slate-400">
          All financial data is stored locally in <code className="font-mono text-cyan-400">data/solobiz.sqlite</code>.
        </p>

        {resetMessage && (
          <div className="p-2.5 rounded-lg bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs">
            {resetMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] hover:text-white transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Ledger to JSON</span>
          </button>

          {confirmReset ? (
            <div className="flex items-center gap-2 p-1.5 bg-rose-950/70 border border-rose-800/80 rounded-lg text-xs">
              <span className="text-rose-300 px-1 font-medium">Delete ALL records?</span>
              <button
                type="button"
                onClick={executeResetDatabase}
                disabled={isResetting}
                className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                {isResetting ? 'Wiping...' : 'Yes, Wipe Everything'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                disabled={isResetting}
                className="px-2 py-1 text-xs text-slate-300 hover:text-white bg-white/[0.06] rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-lg hover:bg-rose-900/50 transition-all shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Database</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
