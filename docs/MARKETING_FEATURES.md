# AI FileSense — Features & Benefits

> **Last updated:** 2026-02-18
> **Audience:** Investors, partners, marketing website, app store listings, pitch decks

---

## One-Liner

AI FileSense is a Windows desktop app that uses AI to classify and organize your local documents into a clean, consistent folder system — without uploading your files to the cloud.

## Elevator Pitch

Most people have hundreds or thousands of documents scattered across their Desktop, Documents, and Downloads folders with no system. Organizing manually takes hours and most people give up after 10 minutes. Cloud-based solutions require uploading sensitive personal files to someone else's servers.

AI FileSense fixes this in under 5 minutes. Point it at your folders, let the AI read and classify your files locally, review the plan, and click Organize. Every move is logged. Every change is reversible. Your files never leave your computer.

---

## The Problem

| Pain Point | Who Feels It |
|------------|-------------|
| Hundreds of files dumped on Desktop with no structure | Everyone |
| Can never find "that document" when you need it | Everyone |
| Tried organizing manually but gave up | Everyone |
| Afraid of losing files if software moves them wrong | Non-technical users |
| Don't trust cloud services with tax returns, medical records, contracts | Privacy-conscious users |
| Documents in both English and Spanish with no bilingual tools | US Hispanic households |
| No time to sort through years of accumulated files | Busy professionals, parents |

---

## Core Features

### 1. AI-Powered Document Classification

The AI reads the actual content of your files — not just filenames — to understand what each document is. A file named `scan_2024_03.pdf` that contains medical lab results gets classified as Health, not left in a generic folder.

- **Supported formats:** PDF, Word (.doc/.docx), PowerPoint (.pptx), text files (.txt, .md, .csv, .log)
- **Content extraction:** First page of PDFs, full text from Word/PowerPoint, first N lines of text files
- **Batch processing:** 20 files per AI call with rate limiting and error recovery
- **Incremental scanning:** Only new or changed files get re-classified (SHA-256 hash detection)
- **AI model:** Claude Haiku — fast, accurate, cost-efficient

### 2. The 12-Folder System

Every file gets sorted into one of 12 numbered folders. The numbers guarantee consistent alphabetical sort order across every file manager on every operating system.

| # | Folder | Spanish | What Goes Here |
|---|--------|---------|----------------|
| 00 | Review | Revisar | Low-confidence files needing your decision |
| 01 | Work | Trabajo | Resumes, payslips, performance reviews, HR documents |
| 02 | Money | Dinero | Bank statements, taxes, receipts, invoices |
| 03 | Home | Casa | Mortgage docs, utilities, warranties, vehicle records |
| 04 | Health | Salud | Medical records, prescriptions, lab results, insurance |
| 05 | Legal | Legal | Contracts, agreements, IDs, wills, licenses |
| 06 | School | Escuela | Transcripts, coursework, certifications, research papers |
| 07 | Family | Familia | Personal letters, kids' records, family documents |
| 08 | Clients | Clientes | Client documents, vendor contracts, invoices |
| 09 | Projects | Proyectos | Active project files (AI creates dynamic subfolders) |
| 10 | Travel | Viajes | Passports, visas, boarding passes, itineraries |
| 11 | Archive | Archivo | Old/inactive documents organized by year |

**Smart subcategories:** Within each folder, the AI creates meaningful subfolders. Family gets subfolders by person name. Clients get subfolders by company. Projects get subfolders by project name. Archive organizes by year.

### 3. Safety-First File Operations

This is the feature that makes non-technical users trust the app. Every single file move is logged, reversible, and transparent.

- **Full undo support:** Undo a single file, an entire session, or everything — even after closing and reopening the app
- **Transaction logging:** Every move recorded in a local SQLite database with source path, destination path, and timestamp
- **Test mode by default:** The app ships with `testMode: true` — nothing actually moves until you explicitly enable real mode
- **No files are ever deleted:** Files are only moved, never removed
- **Crash recovery:** If the app closes mid-operation, it detects the incomplete session on next launch and offers three options: Resume, Rollback, or Discard
- **Session tracking:** Each organization run gets a unique session ID with a complete audit trail

### 4. Bilingual — English + Spanish (Mexico)

Not a Google Translate afterthought. The entire app is natively bilingual:

- All UI text, labels, buttons, and error messages in both languages
- AI-generated clarification questions come in both English and Spanish natively
- Category names and folder names localized (Work/Trabajo, Money/Dinero, etc.)
- 23 rotating status messages during scanning in both languages
- Language toggle accessible from the welcome screen and settings

### 5. Smart Clarification Questions

When the AI isn't sure about some files, it doesn't just dump them in a "Review" pile. It asks you targeted questions to resolve the ambiguity.

- 0-5 AI-generated questions per organization run
- Example: "Are these class notes for school or professional development for work?"
- Each question shows the affected files, candidate destinations, and confidence percentages
- Questions support single-select, multi-select, text input, and yes/no formats
- AI provides a recommended answer for each question
- Skip individual questions or skip all — the app handles it gracefully

### 6. Privacy by Design

Your documents contain your life — tax returns, medical records, contracts, family photos. AI FileSense is architected so that sensitive content stays on your machine.

- **Files never leave your computer.** Only filenames and 300-character content snippets are sent to the AI API for classification.
- **Prompt injection prevention:** File data sent to the AI is serialized via `serde_json`, not string concatenation. Malicious filenames cannot break the AI prompt structure.
- **No account required.** No signup, no cloud sync, no telemetry.
- **Single-instance enforcement:** OS-level file lock prevents two instances from running simultaneously and corrupting state.
- **Atomic settings writes:** Settings saved via temp file + rename to prevent data corruption on crash.

### 7. Freemium Model — Zero Configuration

The developer provides the Anthropic API key. Users never need to configure an API key, create an account, or understand what an API is. This removes the single biggest friction point for non-technical users.

- **Free tier:** 10 organization scans, up to 500 files per scan
- **Backend-enforced:** Scan limits tracked server-side in Rust — cannot be bypassed via browser devtools or frontend manipulation
- **Bring your own key:** Power users can optionally enter their own Anthropic API key in Settings for unlimited usage
- **Connection test:** One-click API key verification that makes a real API call to confirm the key works

### 8. Confidence-Based Routing

The AI doesn't pretend to be certain about everything. Each classification comes with a confidence score, and the app acts on that honestly.

- **High confidence (0.80–0.98):** File goes directly to its category folder
- **Medium confidence (0.50–0.79):** File gets classified but may trigger a clarification question
- **Low confidence (below 0.35):** File routes to the Review folder for human decision
- **Confidence is clamped to 0.50–0.98** — the AI is never allowed to claim 0% or 100% certainty
- **Extension-only files** (no parseable content) automatically route to Review

### 9. Activity Log & Audit Trail

Every organization run is tracked with enterprise-grade logging:

- **Session records:** UUID-identified sessions with start time, end time, status, and operation counts
- **Operation records:** Individual file moves with source, destination, file metadata, confidence score, and status
- **Error tracking:** Errors captured with severity levels (low/medium/high/critical) and resolution status
- **Human-readable export:** Generate plain-text session reports for record-keeping
- **Auto-cleanup:** Old sessions purged after configurable retention period (default 90 days)
- **Granular undo:** Undo a single operation within a session, or roll back the entire session

### 10. Dashboard — Home Base

After organizing, the Dashboard becomes your maintenance hub:

- **Health status bar:** Green "Your files are organized" or amber "Some files need review"
- **12-folder grid:** Color-coded cards showing file counts, last-updated timestamps, and one-click folder access
- **Attention cards:** Conditional alerts for files needing review, new files detected, or duplicate groups found
- **Automation controls:** Toggle switches for auto-organize, safe mode (route to Review first), and auto-archive (4+ year rule)
- **Activity feed:** Recent operations with timestamps

---

## Technical Differentiators

| Feature | AI FileSense | Typical Cloud Organizer |
|---------|-------------|------------------------|
| File upload required | No — files stay local | Yes — everything goes to their servers |
| AI classification | By actual content | By filename only |
| Undo support | Full transaction log | Limited or none |
| Crash recovery | Automatic detection + 3 recovery options | Hope for the best |
| Language support | Native bilingual (EN/ES-MX) | English only |
| App size | ~5 MB (Tauri) | ~200 MB (Electron) |
| Database | Local SQLite with WAL mode | Cloud database |
| Incremental scanning | SHA-256 hash-based change detection | Full re-scan every time |
| Free tier enforcement | Backend (Rust) — tamper-proof | Frontend JavaScript — easily bypassed |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop shell | Tauri 2 | ~5 MB vs 200 MB for Electron. Native Windows WebView2. |
| Backend | Rust | Memory-safe file operations. No null pointer crashes. Fast. |
| Frontend | React + TypeScript + Vite | Modern, fast development. Type safety. |
| UI components | shadcn/ui + Tailwind CSS | Clean, accessible, consistent design system |
| Database | SQLite (rusqlite, WAL mode) | Local, portable, reliable. No server needed. |
| AI | Anthropic Claude Haiku | Fast, accurate, cost-efficient classification |
| Document parsing | pdf-extract, quick-xml, zip | Native Rust parsers for PDF, DOCX, PPTX |
| File hashing | SHA-256 (sha2 crate) | Reliable change detection for incremental scanning |
| Directory traversal | walkdir | Recursive scanning with depth limits and hidden file filtering |
| OS integration | dirs crate | Resolves real Windows paths for Desktop/Documents/Downloads |

---

## User Flow — 5 Steps

```
Step 1: Choose Folders + File Types
        Pick from Desktop, Documents, Downloads, or add custom folders.
        Select which file types to scan (PDF, Word, Text).
                    ↓
Step 2: Scan & Analyze
        Discovery phase finds all matching files.
        AI phase reads content and classifies each file.
        Pause, resume, or cancel at any time.
                    ↓
Step 3: Preview Results
        See the 12-folder breakdown with file counts.
        Review folder highlighted if files need attention.
                    ↓
Step 4: Quick Clarifications
        Answer 0–5 AI-generated questions about ambiguous files.
        Skip any or all questions.
                    ↓
Step 5: Organize & Celebrate
        Watch files get organized in real-time.
        See results: files moved, folders created, review count.
        One-click undo available immediately.
```

---

## Who It's For

| Persona | Why They Care |
|---------|--------------|
| **Busy parents** | Years of school forms, medical records, and tax docs piled up. Need order but have zero time. |
| **Freelancers & consultants** | Client documents scattered everywhere. Need project-based organization that the AI creates automatically. |
| **Students** | Coursework, transcripts, and research papers mixed with personal files. School vs. Work disambiguation built in. |
| **Small business owners** | Client invoices, vendor contracts, and HR docs need clean separation. Clients + Projects folders handle this. |
| **Retirees** | Decades of accumulated documents. Archive folder auto-sorts by year. Simple interface, no technical knowledge needed. |
| **Privacy-conscious users** | Won't upload files to Dropbox or Google Drive. FileSense keeps everything local. |
| **Bilingual households** | English/Spanish speakers get a fully native experience in both languages. |

---

## Competitive Landscape

| Solution | Limitation AI FileSense Solves |
|----------|-------------------------------|
| **Manual organization** | Takes hours. Most people give up. AI does it in minutes. |
| **Cloud storage (Google Drive, Dropbox)** | Requires uploading all files to third-party servers. |
| **Desktop search (Everything, Copernic)** | Finds files but doesn't organize them. |
| **Rule-based organizers (Hazel, DropIt)** | Requires writing rules manually. No content understanding. |
| **ChatGPT / Claude web** | Can't access your local filesystem. Not a desktop app. |

---

## Key Metrics & Cost Economics

| Metric | Value |
|--------|-------|
| Cost per file classified | ~$0.0015 (0.15 cents) |
| Cost per 500-file scan | ~$0.75 |
| Max cost per free user (10 scans) | ~$7.50 |
| App size | ~5 MB |
| Time to organize | ~5 minutes |
| Supported file types | PDF, DOCX, DOC, PPTX, TXT, MD, CSV, TSV, LOG |
| Categories | 12 (numbered 00–11) |
| Languages | English, Spanish (Mexico) |
| Platform | Windows 10/11 |

---

## Planned Features (Not Yet Shipped)

| Feature | Status | Description |
|---------|--------|-------------|
| **File watcher** | UI built, backend pending | Auto-organize new files as they appear in Downloads |
| **Duplicate detection UI** | Backend built, UI pending | Review and resolve duplicate files across folders |
| **Full-text search** | FTS5 index exists, query pending | Find files by describing them in natural language |
| **Personalization wizard** | Component built, currently bypassed | 4-question onboarding to tailor the AI's behavior |
| **Mac support** | Not started | Tauri supports macOS — requires build/test pipeline |
| **Additional file types** | Not started | Spreadsheets (.xlsx), images (OCR), email (.eml) |

---

## Trust Statements

These three promises appear on the Welcome screen and throughout the app:

1. **"Files stay local."** — Your documents are analyzed on your computer. Only filenames and short text snippets are sent to the AI. The full files never leave your machine.

2. **"You approve every change."** — Nothing moves without your review. See exactly where every file will go before clicking Organize.

3. **"Undo is always available."** — Every file move is logged. Reverse a single file or everything with one click, even after closing and reopening the app.
