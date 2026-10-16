import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileText,
  AlertTriangle,
  RefreshCw,
  Eye,
  FileCheck2,
  HardDrive,
  Cpu,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  uploadAndExtract,
  createExpense,
  extractFromRawText,
} from '../api';
import { ExtractionResult, ExpenseRecord, CurrencyCode } from '../types';

interface UploadVerifyViewProps {
  onSaved: (expense: ExpenseRecord) => void;
  onNavigateToExpenses: () => void;
}

export const UploadVerifyView: React.FC<UploadVerifyViewProps> = ({
  onSaved,
  onNavigateToExpenses,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [rawTextEntry, setRawTextEntry] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'ocr' | 'parsing'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Review stage state
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [sourceDocName, setSourceDocName] = useState<string>('');
  const [sourceDocPath, setSourceDocPath] = useState<string | undefined>();
  const [sourceDocType, setSourceDocType] = useState<string | undefined>();

  // Editable Form fields
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [subtotal, setSubtotal] = useState<string>('');
  const [tax, setTax] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [category, setCategory] = useState('General');
  const [notes, setNotes] = useState('');

  // Track which fields the user manually modified
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showOcrText, setShowOcrText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (selected: File) => {
    if (selected.size > 10 * 1024 * 1024) {
      setError('File exceeds maximum size of 10MB.');
      return;
    }
    setFile(selected);
    setError(null);

    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const processUpload = async () => {
    if (!file && !rawTextEntry.trim()) {
      setError('Select a document or paste receipt text.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingStage('uploading');

    try {
      setTimeout(() => setProcessingStage('ocr'), 300);
      setTimeout(() => setProcessingStage('parsing'), 900);

      let result;
      if (file) {
        const formData = new FormData();
        formData.append('document', file);
        result = await uploadAndExtract(formData);
      } else {
        result = await extractFromRawText(rawTextEntry, 'pasted_receipt.txt');
      }

      populateReview(
        result.extraction,
        result.sourceDocumentName || file?.name || 'receipt',
        result.sourceDocumentPath,
        result.sourceDocumentType
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsProcessing(false);
      setProcessingStage('idle');
    }
  };

  const populateReview = (
    ext: ExtractionResult,
    docName: string,
    docPath?: string,
    docType?: string
  ) => {
    setExtraction(ext);
    setSourceDocName(docName);
    setSourceDocPath(docPath);
    setSourceDocType(docType);

    setMerchant(ext.merchant.value || '');
    setDate(ext.date.value || new Date().toISOString().split('T')[0]);
    setCurrency(ext.currency.value || 'USD');
    setSubtotal(ext.subtotal.value !== null && ext.subtotal.value !== undefined ? ext.subtotal.value.toString() : '');
    setTax(ext.tax.value !== null && ext.tax.value !== undefined ? ext.tax.value.toString() : '');
    setTotal(ext.total.value ? ext.total.value.toString() : '');
    setCategory(ext.category.value || 'General');
    setNotes('');
    setUserEditedFields(new Set());
  };

  const markFieldEdited = (fieldName: string) => {
    setUserEditedFields((prev) => new Set(prev).add(fieldName));
  };

  const calculateArithmeticConflict = (): string | null => {
    const subNum = parseFloat(subtotal);
    const taxNum = parseFloat(tax);
    const totNum = parseFloat(total);

    if (!isNaN(subNum) && !isNaN(taxNum) && !isNaN(totNum) && totNum > 0) {
      const sum = Math.round((subNum + taxNum) * 100) / 100;
      if (Math.abs(sum - totNum) > 0.05) {
        return `Subtotal (${subNum.toFixed(2)}) + Tax (${taxNum.toFixed(2)}) = ${sum.toFixed(2)} ≠ Total (${totNum.toFixed(2)})`;
      }
    }
    return null;
  };

  const handleConfirmAndSave = async () => {
    const totalNum = parseFloat(total);
    if (isNaN(totalNum) || totalNum <= 0) {
      setError('A valid positive total amount is required.');
      return;
    }
    if (!merchant.trim()) {
      setError('Merchant name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const subNum = subtotal ? parseFloat(subtotal) : null;
      const taxNum = tax ? parseFloat(tax) : null;

      const created = await createExpense({
        merchant: merchant.trim(),
        date,
        currency,
        subtotal: subNum,
        tax: taxNum,
        total: totalNum,
        category,
        notes: notes.trim() || undefined,
        sourceDocumentName: sourceDocName,
        sourceDocumentPath: sourceDocPath,
        sourceDocumentType: sourceDocType,
        extractionStatus: userEditedFields.size > 0 ? 'manual' : 'verified',
        confidenceScores: extraction
          ? {
              merchant: extraction.merchant.confidence,
              total: extraction.total.confidence,
              date: extraction.date.confidence,
            }
          : undefined,
        userEditedFields: Array.from(userEditedFields),
      });

      onSaved(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsSaving(false);
    }
  };

  const arithmeticWarning = calculateArithmeticConflict();

  return (
    <div className="space-y-6 py-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-cyan-400">DOCUMENT INTAKE & OCR</div>
          <h1 className="text-2xl font-black tracking-tight text-white font-display mt-0.5">
            Receipt Verification
          </h1>
        </div>

        <button
          onClick={onNavigateToExpenses}
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 self-start sm:self-auto flex items-center gap-1"
        >
          <span>View Verified Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-3"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 font-mono">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-400 hover:underline"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Main Flow: Upload Area vs Verification Workspace */}
      <AnimatePresence mode="wait">
        {!extraction ? (
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="max-w-3xl mx-auto space-y-4"
          >
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Upload Receipt or Invoice
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  PDF, PNG, JPG, WEBP up to 10MB
                </span>
              </div>

              {/* Animated Dropzone with Laser Scan Beam */}
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer group overflow-hidden ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
                    : 'border-slate-700/80 hover:border-cyan-500/50 bg-[#070b1a]/60'
                }`}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Corner HUD Reticles */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors pointer-events-none" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors pointer-events-none" />

                {/* Animated Laser Scan Bar */}
                {isProcessing && (
                  <motion.div
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_18px_#22d3ee] pointer-events-none z-20"
                    animate={{ top: ['0%', '96%', '0%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {filePreview ? (
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] mb-3 bg-black">
                      <img src={filePreview} alt="Receipt thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-bold text-white font-display truncate max-w-xs">{file?.name}</p>
                    <span className="text-[11px] font-mono text-cyan-400 font-bold mt-1 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                      {file ? `${(file.size / 1024).toFixed(1)} KB · Click or drag to replace` : ''}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <Upload className="w-6 h-6" />
                    </div>

                    <p className="text-sm font-bold text-white mt-3 font-display">
                      {file ? file.name : 'Drop receipt image or PDF here'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Drag and drop your file or click to browse
                    </p>

                    {file && (
                      <span className="text-[11px] font-mono text-cyan-400 font-bold mt-2 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                        {(file.size / 1024).toFixed(1)} KB ready
                      </span>
                    )}
                  </>
                )}
              </label>

              {/* Paste Raw OCR text */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-400">
                  Or paste receipt text directly:
                </label>
                <textarea
                  value={rawTextEntry}
                  onChange={(e) => setRawTextEntry(e.target.value)}
                  placeholder="ACME CLOUD CORP&#10;Date: 2026-10-10&#10;Total: $48.60 USD"
                  rows={2}
                  className="w-full text-xs font-mono p-3 rounded-lg border border-slate-800 bg-[#070b18] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Progress bar and submit button */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
                  {isProcessing && (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {processingStage === 'ocr'
                          ? 'Extracting raw text streams...'
                          : processingStage === 'parsing'
                          ? 'Running model field validation...'
                          : 'Uploading document...'}
                      </span>
                    </>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={processUpload}
                  disabled={isProcessing || (!file && !rawTextEntry.trim())}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)]"
                >
                  <span>Extract Fields</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Verification Screen */
          <motion.div
            key="verify-workspace"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/60 border border-white/[0.08] rounded-xl text-xs backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  {extraction.inferenceMode === 'local' ? (
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                  ) : extraction.inferenceMode === 'deterministic' ? (
                    <Cpu className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  )}
                  <span>Model: {extraction.modelUsed}</span>
                </div>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 font-mono">
                  Source: <strong className="text-slate-200">{sourceDocName}</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowOcrText(!showOcrText)}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showOcrText ? 'Hide OCR' : 'Inspect OCR'}</span>
                </button>
                <button
                  onClick={() => setExtraction(null)}
                  className="text-slate-400 hover:text-rose-400 underline"
                >
                  Discard
                </button>
              </div>
            </div>

            {/* Raw OCR Inspection */}
            {showOcrText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#030610] text-slate-300 p-4 rounded-xl text-xs font-mono space-y-2 border border-slate-800 max-h-60 overflow-y-auto"
              >
                <div className="text-cyan-400 font-bold text-[11px]">Extracted Text Stream:</div>
                <pre className="whitespace-pre-wrap">{extraction.rawOcrText}</pre>
              </motion.div>
            )}

            {/* Arithmetic Warnings */}
            {(extraction.warnings.length > 0 || arithmeticWarning) && (
              <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl space-y-1.5 text-xs text-amber-300">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Verification Check Required:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-amber-200/90 font-mono text-[11px]">
                  {arithmeticWarning && <li className="text-rose-400 font-bold">{arithmeticWarning}</li>}
                  {extraction.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Side-by-Side Review Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Source Document (5 cols) */}
              <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-5 space-y-4">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">
                  Document Source
                </h3>

                {filePreview ? (
                  <div className="border border-slate-800 rounded-lg overflow-hidden max-h-96 flex items-center justify-center bg-[#030610]">
                    <img
                      src={filePreview}
                      alt="Receipt preview"
                      className="object-contain max-h-96 w-full"
                    />
                  </div>
                ) : (
                  <div className="p-8 border border-slate-800 rounded-lg text-center bg-[#070b18] space-y-2">
                    <FileText className="w-10 h-10 text-cyan-400 mx-auto" />
                    <p className="text-xs font-bold text-white font-mono">{sourceDocName}</p>
                    <p className="text-[11px] text-slate-400">Extracted from stream</p>
                  </div>
                )}

                {/* Confidence scores */}
                <div className="pt-2 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                  <div className="p-2 bg-white/[0.03] rounded border border-white/[0.06]">
                    <span className="text-slate-400 block text-[10px]">Merchant</span>
                    <span className="font-bold text-cyan-400">
                      {Math.round(extraction.merchant.confidence * 100)}%
                    </span>
                  </div>
                  <div className="p-2 bg-white/[0.03] rounded border border-white/[0.06]">
                    <span className="text-slate-400 block text-[10px]">Date</span>
                    <span className="font-bold text-cyan-400">
                      {Math.round(extraction.date.confidence * 100)}%
                    </span>
                  </div>
                  <div className="p-2 bg-white/[0.03] rounded border border-white/[0.06]">
                    <span className="text-slate-400 block text-[10px]">Total</span>
                    <span className="font-bold text-cyan-400">
                      {Math.round(extraction.total.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Editable Form (7 cols) */}
              <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-slate-900/40 backdrop-blur-md p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <h3 className="text-sm font-bold text-white font-display">
                    2. Review & Commit Record
                  </h3>
                  {userEditedFields.size > 0 && (
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                      {userEditedFields.size} field(s) edited
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Merchant */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-slate-300">Merchant / Vendor</label>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => {
                        setMerchant(e.target.value);
                        markFieldEdited('merchant');
                      }}
                      className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#070b18] text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        markFieldEdited('date');
                      }}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-[#070b18] text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Currency */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        markFieldEdited('currency');
                      }}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-[#070b18] text-white text-sm font-semibold focus:outline-none focus:border-cyan-500"
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

                  {/* Subtotal */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Subtotal</label>
                    <input
                      type="number"
                      step="0.01"
                      value={subtotal}
                      placeholder="0.00"
                      onChange={(e) => {
                        setSubtotal(e.target.value);
                        markFieldEdited('subtotal');
                      }}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-[#070b18] text-white text-sm font-mono tabular-nums focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Tax */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Tax</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tax}
                      placeholder="0.00"
                      onChange={(e) => {
                        setTax(e.target.value);
                        markFieldEdited('tax');
                      }}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-[#070b18] text-white text-sm font-mono tabular-nums focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Total */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-white">Verified Total Amount *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-cyan-400 font-mono">
                        {currency}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={total}
                        onChange={(e) => {
                          setTotal(e.target.value);
                          markFieldEdited('total');
                        }}
                        className="w-full pl-14 p-2.5 rounded-lg border border-cyan-500/50 bg-[#070b18] text-white text-base font-bold font-mono tabular-nums focus:outline-none focus:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-slate-300">Category</label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        markFieldEdited('category');
                      }}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-[#070b18] text-white text-sm focus:outline-none focus:border-cyan-500"
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

                  {/* Notes */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-semibold text-slate-300">Notes</label>
                    <input
                      type="text"
                      value={notes}
                      placeholder="Brief description or purpose"
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-700 bg-[#070b18] text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExtraction(null)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleConfirmAndSave}
                    disabled={isSaving || !total || parseFloat(total) <= 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-lg hover:from-cyan-300 hover:to-sky-200 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Confirm & Save Entry'}</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
