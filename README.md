# SoloBiz AI — Open-Source AI Side Hustle Financial Assistant

SoloBiz AI is a local-first, privacy-focused financial assistant for freelancers and independent service providers. It processes receipts, extracts invoice details, organizes expenses, and generates client invoice PDFs using open-weight AI (Gemma via Ollama) and local SQLite storage.

---

## 1. The Problem & Why Open-Weight AI Matters

Freelancers spend hours every month manually transcribing receipt totals, categorizing expenses, and writing invoices. However, commercial financial documents contain sensitive client names, rates, and banking data that solo operators often do not want to upload to commercial cloud AI vendors.

### The Open-Weight AI Advantage:
1. **Local-First Privacy**: Sensitive documents and financial sums are processed on-device. When running Gemma through Ollama, zero data leaves the machine.
2. **Separation of AI & Arithmetic**: Language models parse messy unstructured OCR text; application code performs all mathematical calculations (taxes, invoice totals, currency totals).
3. **No Silent Fallback**: The app never quietly diverts sensitive data to a cloud API when local models are unavailable.
4. **Vendor Independence**: Standard model-provider abstraction allows plugging in Gemma, Llama, deterministic regex parsers, or cloud models without changing application business logic.

---

## 2. Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Backend**: Node.js, Express, TypeScript (`server.ts`).
- **Database**: SQLite (WebAssembly `sql.js` with local filesystem persistence in `data/solobiz.sqlite`).
- **Document OCR**: Open-source `tesseract.js` for images and structured PDF stream extractor for digital invoices.
- **AI Inference Abstraction**:
  - **Local Gemma via Ollama** (`gemma2:2b` or `gemma:2b` on `http://127.0.0.1:11434`)
  - **Deterministic Rule-Based Parser** (100% offline regex & tabular parser with zero external LLM dependencies)
  - **Remote Gemini** (optional cloud fallback via `@google/genai` `gemini-3.8-flash` with explicit user opt-in and privacy warnings)
- **PDF Generation**: `jspdf` for vectorized, print-ready client invoice PDFs matching verified ledger numbers.

---

## 3. Core Features

### A. Receipt & Invoice Upload
- Accepts image formats (JPG, PNG, WEBP) and PDF files up to 10MB.
- Path traversal defense with randomized, sanitized storage in `data/uploads/`.
- Extracts raw text using open OCR and parses merchant, date, currency, subtotal, tax, and total.

### B. Human Verification Workflow
- Displays side-by-side extracted fields and document reference.
- Highlights uncertain values and arithmetic discrepancies (e.g. `subtotal + tax !== total`).
- Distinguishes model-extracted data from user-corrected values.
- Commits records to the database only after explicit user approval.

### C. Expense Ledger
- Search, filter by category or currency, edit, and delete saved records.
- Totals are strictly computed per currency—amounts in different currencies are never added without conversion.
- Deleting an expense removes its disk file and recalculates dashboard summaries immediately.

### D. Invoice Builder & PDF Export
- Manage client details, payment terms, and dynamic line items (quantity, unit price).
- Automated subtotal, tax rate, and grand total calculations.
- Track invoice lifecycles (`draft`, `sent`, `paid`, `overdue`).
- One-click PDF download with professional layout and verified figures.

### E. Record-Grounded Business Assistant
- Answers natural language questions exclusively using saved database records.
- Provides explicit citations with record IDs for transparency.
- Transparently reports when data is missing instead of hallucinating financial figures.

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js 20+
- (Optional, for local Gemma AI) [Ollama](https://ollama.ai) installed on your machine.

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Run local Gemma model with Ollama (in a separate terminal)
ollama run gemma2:2b

# 3. Start development server (serves Express API and Vite on port 3000)
npm run dev

# 4. Open in browser
http://localhost:3000
```

---

---

## 5. Deploying to Render

SoloBiz AI is pre-configured with a `render.yaml` blueprint and can be deployed with one click or via manual web service setup on Render.

### Option A: Deploy via Blueprint (Fastest)
1. Push this repository to your GitHub or GitLab account.
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Select your SoloBiz AI repository.
5. Render reads `render.yaml` automatically and configures:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: `NODE_ENV=production`
6. Click **Apply** to deploy!

### Option B: Deploy as a Manual Web Service
1. Click **New +** → **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `solobiz-ai`
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: (Render sets this automatically; SoloBiz AI listens on `process.env.PORT || 3000`)
   - `GEMINI_API_KEY`: *(Optional)* If you wish to use remote Gemini 3.8 Flash in addition to the default Offline Processing.
5. Click **Deploy Web Service**.

> **Note on Persistence on Render**: SoloBiz AI uses a lightweight SQLite database stored in `data/solobiz.sqlite` and uploaded documents in `data/uploads/`. On Render's Free tier, the local filesystem is ephemeral. To persist receipts across service restarts in production, navigate to your Render service **Disks** tab and add a Persistent Disk mounted at `/data` (1 GB or more).

---

## 6. Privacy & Data Handling Guarantee

- **Database**: All ledger records reside in `data/solobiz.sqlite`.
- **Uploaded Documents**: Stored in `data/uploads/`. When an expense is deleted, its file is unlinked.
- **Network Transparency**:
  - In **Local Gemma** mode: 100% local HTTP calls to `127.0.0.1:11434`. Zero external network calls.
  - In **Deterministic / Offline Processing** mode: 100% offline in-memory execution.
  - In **Remote Gemini** mode: Clearly flagged with a "Remote Cloud" badge and explicit privacy notice.

---

## 7. License

MIT License. Open source for independent creators and freelancers.
