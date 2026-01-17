> **NOTE**: This is the original planning document. Some features have been modified or removed in the current implementation:
> - **Search feature removed** - App focuses solely on file organization
> - **Freemium model** - Developer provides Anthropic API key, users don't need API keys
> - **Simplified flow** - Welcome screen goes directly to folder selection (no "Find a file" option)
> - **File types** - Currently supports PDF, TXT, and Word documents only
> - **AI Provider** - Using Anthropic Claude Haiku only (not OpenAI)

---

Got it. Let's do this "AI-first" **without** making it slow, scary, or architecturally messy.

Below is a **stress-tested, Windows-realistic** design where:

- the **LLM “understands”** each file (name + metadata + first-page/first-100-lines),
- the app stores that understanding in a **local index** (fast),
- the user picks an organization style **after seeing what kinds of documents they actually have**,
- then the app generates a **move plan** and executes it deterministically with **Undo**.

And we’ll keep everything extremely user-friendly.

---

## Repo naming convention you want

Pattern:

> `ai-<primary-descriptor>`

Examples that fit the product well:

- **`ai-filesense`** (best overall)
- **`ai-filepilot`**
- **`ai-docsort`**
- **`ai-deskdetox`**
- **`ai-fileclarity`**

My pick: **`ai-filesense`**
It’s short, brandable, and communicates “understanding,” not “folders.”

---

## The main strategy (what makes this work well)

### Key principle

**LLM does interpretation. The app does execution.**

So the pipeline is:

1. **Scan fast** (local, deterministic)
2. **Sample content** (small, controlled extracts)
3. **LLM classification** (batched, cached, incremental)
4. **User chooses structure** (in plain English, with preview)
5. **Planner generates a move plan** (JSON manifest + DB record)
6. **Executor moves files safely** (staging + transaction log + undo)
7. **Search stays amazing forever** (semantic + “used to be on Desktop”)

This avoids the two big failures:

- “rules-only classification that misses messy real life”
- “LLM moving things directly and creating chaos”

---

## Why a local DB beats “a folder of JSON files”

You _can_ store one JSON per file, but it becomes slow + messy when you need:

- fast search
- filtering
- dedupe detection
- history (“where was this before?”)
- undo
- incremental rescans

### Best practice (fast + simple)

- **SQLite is canonical**
- You can still export a **portable JSON report** when needed

So: **SQLite first**, JSON as an “export artifact.”

SQLite is built into Windows ecosystems and works great for Tauri/.NET apps.

---

## Tech stack (best UI + performance on Win10/11)

### Desktop app

- **Tauri 2 (desktop shell)**
- **Rust (file engine)**: scanning, hashing, reading snippets, move/undo
- **React + TypeScript (UI)**: modern, friendly UI
- **shadcn/ui** for polished components

### Local storage

- **SQLite** (file index + AI metadata + move history)
- SQLite Full-Text Search:

  - **FTS5** for fast keyword search

- Optional semantic search:

  - embeddings stored locally (either in SQLite or a lightweight vector index)

### AI providers

- OpenAI or Anthropic via API
- You can offer a simple toggle:

  - “AI Engine: OpenAI / Anthropic”
  - purely a configuration option (portfolio flex)

### Installer

- Tauri can produce a Windows installer (MSI/EXE). For “real” distribution later:

  - code signing (optional later)
  - update mechanism (optional later)

**No local Postgres needed.** It adds operational complexity with no upside for a local desktop utility.

---

## The user journey (non-technical, wife-friendly)

### 0) Website → download → install

- User visits a simple site and clicks:

  - **Download for Windows**

- Installs, launches app

### 1) First screen: “Find & Organize”

Two giant buttons:

- **Find a file**
- **Clean up my Desktop**

This matters: “Find” reduces fear. “Organize” comes next.

### 2) Folder selection (no paths)

Default toggles already enabled:

- Desktop ✅
- Documents ✅
- Downloads ✅

Optional:

- “Add another folder” (native folder picker)

### 3) Quick scan (fast)

App immediately shows:

- “We found 1,842 documents (612 PDFs).”
- “Top clusters: Bills, Medical, School, Manuals…”

These clusters come from AI _or_ lightweight grouping early, but in your AI-first version we can do it from **a quick AI sample** (explained below).

### 4) “Choose your organization style” (AI-generated options)

Now that we know what kinds of files exist, we present 3 options like:

- **Life Areas** (Medical, Home, Finances, Work, School)
- **Timeline Archive** (2026/01, 2026/02…)
- **People & Projects** (Family, Doctors, Employers, Clients)

Each option includes:

- simple explanation
- a folder tree preview
- “Best for you if…”

### 5) “Review before we move anything”

A plan preview:

- how many files per folder
- list of low-confidence items
- duplicates found
- toggle: “Stage first (recommended)” ✅

### 6) Organize

- progress bar
- pause/resume
- done screen:

  - “Desktop cleaned”
  - “Undo last run”
  - “Search your files”

### 7) Search like Google

Search box:

- “that insurance pdf from last year”
- filter: “Used to be on Desktop”
- results show:

  - current location
  - previous location
  - open / reveal in explorer

---

## The core workflow engine (the part you were asking for)

You were right to focus on:
“How do we go from file → AI JSON entry → move?”

Here’s the best way.

### Phase A — Scan (local, fast)

For each file:

- path, name, extension
- created/modified time
- size
- optional: quick hash (for duplicates later)

Store in SQLite as “discovered”.

### Phase B — Extract “AI snippet” (controlled)

For each file type:

- **PDF:** first page text (or first ~100 lines equivalent)
- **DOCX:** first N paragraphs (optional later)
- **Images:** skip OCR in v1 unless needed

Important: keep snippet capped (small tokens). This is what keeps it fast.

### Phase C — AI classify (batched + cached)

Send **batches** to the LLM, not one-by-one.

Each item includes:

- filename
- metadata
- small snippet

LLM outputs structured JSON for each file:

- category + subcategory
- tags
- confidence
- short summary
- suggested “safe” folder path components (optional)

Store results in SQLite.

**Caching rules (critical for speed):**

- if file hash + modified date unchanged → don’t re-AI it
- only AI new/changed files on subsequent runs

### Phase D — Generate organization plan (deterministic)

Once the user picks a model (Life Areas / Timeline / Projects):

- planner computes destination paths using:

  - chosen model
  - AI categories/tags
  - dates (for timeline model)
  - confidence thresholds

Creates a **Move Plan Manifest**:

- stored in SQLite
- exportable JSON for transparency/debugging

Example manifest fields:

- plan_id
- source_path
- destination_path
- confidence
- reason
- requires_review (true if low confidence)

### Phase E — Execute moves (safe)

Executor:

- stages moves (optional but recommended)
- logs every move in a transaction table
- supports full undo

This is pure deterministic filesystem work. No AI here.

---

## Performance: how we keep it from running for hours

This is where most “AI desktop” ideas die. Here’s how we keep it fast.

### 1) Prioritize what matters

Default mode: **Desktop + Documents + Downloads** only.
No full C:\ crawl unless user explicitly opts in.

### 2) Batch LLM calls

Send batches of 20–100 files per request depending on provider limits.
This is dramatically faster than 1-call-per-file.

### 3) Cap content extraction

Only first page / first N lines.
No full-document processing for v1.

### 4) Incremental indexing

After first run, re-runs are fast because only changed files get re-processed.

### 5) Two-speed mode (user-friendly)

- **Quick Clean (Recommended):** filename + metadata + first-page only for PDFs
- **Deep Understanding:** adds more extraction (slower, optional)

Your wife uses Quick Clean. Power users can use Deep.

---

## “Confirm it will work” (stress test logic)

This architecture is “best” because:

- **LLM is used exactly where it’s strongest** (classification + intent search)
- **LLM is constrained** (small snippets, schema output, batch, cached)
- **Filesystem actions are safe and reversible** (manifest + transaction log)
- **Performance is bounded** (limited folders by default + incremental updates)
- **UX matches non-technical reality** (no paths, big buttons, undo, search-first)

If you implement batching + caching + snippet caps, it will not “run for hours and hours” unless the user chooses an enormous scope (entire drive + deep mode), which you can label clearly.

---

## Features & benefits (AI-first marketing version)

### Features

- AI understands files from filename + metadata + snippet
- Natural language search (“that dentist bill last year”)
- AI-generated organization structures tailored to the user’s files
- Preview before moving
- Staging mode + one-click Undo
- Duplicate detection
- “Used to be on Desktop” history filter

### Benefits

- Non-technical users stop losing documents
- Desktop becomes clean without fear
- Files become searchable by meaning, not filename
- Trust and safety: reversible and transparent
- Great portfolio proof: real AI + real desktop constraints handled correctly

---

## Website to host the app (simple, no login for MVP)

You don’t need accounts to ship v1.

### MVP website stack

- **Next.js** (perfect for fast landing pages)
- Pages:

  - Home (hero + screenshots + download button)
  - Privacy (clear explanation of what is sent to AI)
  - FAQ
  - Changelog
  - Support / Contact

### Download strategy

- Host the installer on:

  - GitHub Releases (fastest for MVP)
  - or Cloudflare R2 / S3 later

### No login (for now)

You can monetize later. For MVP:

- keep it frictionless
- keep it trustworthy

---

## Deliverables summary (what you asked for)

- **Repo name:** `ai-filesense`
- **Main business idea:** AI-powered local file understanding + search + safe organization
- **Success criteria:** fast time-to-value, trustworthy undo, search that works with vague memory
- **Features/benefits:** above
- **Tech stack:** Tauri + Rust + React + SQLite + (OpenAI/Anthropic)
- **Planned outline:** scan → extract → AI classify → propose structures → plan → preview → execute → undo → search
- **Website:** Next.js landing + download + privacy + support

---

Yes — **this absolutely makes sense**, and what you’re describing is actually the **most honest, technically correct, and trust-preserving monetization model** for an AI-first desktop app.

What you’re converging on is a **hybrid license + metered AI consumption model**, and it’s exactly how this should be done if you’re using **premium LLMs** and want users to _understand_ what they’re paying for.

Below is a **clean, end-to-end strategy and implementation plan**, rebuilt from scratch with this requirement fully baked in.

---

# High-level monetization strategy (reframed correctly)

### There are **two different value layers**, and they must be monetized differently:

1. **The application itself**

   - UX
   - file scanning
   - indexing
   - search
   - safety (preview, undo)
   - multilingual UI
   - deterministic execution engine

2. **The AI understanding**

   - LLM calls cost money
   - cost scales with usage
   - users should _see_ and _control_ that cost

Trying to bundle these into one flat subscription would:

- confuse users
- erode trust
- hide real costs
- punish light users

So instead:

> **One-time app license + prepaid AI token credits**

This is **the correct model** for this product.

---

# The final monetization model (clear and defensible)

## 1. App license (one-time)

### What it unlocks

- Unlimited scanning
- Unlimited search
- Unlimited plan previews
- File movement engine
- Undo/history
- Multilingual UI
- Offline operation
- Core functionality forever

### Why this is critical

- Builds trust
- Feels like a “real tool”
- No SaaS resentment
- Fits Windows utility expectations

This license **does not include unlimited AI usage** — and that’s okay, because you explain why.

---

## 2. AI token credits (prepaid, transparent)

### What AI credits are used for

- Document understanding (classification, tagging, summaries)
- Semantic embeddings
- Natural-language search interpretation
- Organization plan generation
- Re-analysis after changes

### What they are _not_ used for

- Scanning
- Moving files
- Undo
- Search over existing indexed data

This distinction is crucial for user trust.

---

# How this is explained to users (UX language)

You must explain this **before** they hit a limit.

### Plain-English explanation (example)

> FileSense uses advanced AI to _read and understand_ your documents.
>
> AI processing has a real cost, so FileSense uses prepaid AI credits.
>
> You are always in control:
>
> - You can see how many credits you’ve used
> - Nothing is processed without your approval
> - You can add credits at any time

This framing:

- removes fear
- avoids surprise
- aligns expectations

---

# Technical architecture for AI credits (serious, production-grade)

## Core principle

> **AI usage must be deterministic, measurable, cached, and auditable.**

No “mystery token burn.”

---

## 1. AI Credit Ledger (local + authoritative)

Use **SQLite** as the source of truth.

### Required tables (conceptual)

- `ai_credit_balance`
- `ai_usage_log`
- `file_ai_state`
- `ai_cache`

### Credit balance record

- total purchased credits
- total consumed credits
- remaining credits

Credits are abstracted units (not raw tokens), which protects you from model pricing changes.

---

## 2. How credits are consumed (important)

### AI work is always done in **explicit operations**

Examples:

- “Analyze 200 documents”
- “Re-analyze selected folder”
- “Generate organization plan”
- “Interpret search query”

Each operation:

- estimates cost _before execution_
- shows user the estimate
- requires confirmation if cost > threshold

### Example UI

> This action will use approximately **120 AI credits**
> You have **340 credits remaining**

This is a **huge trust win**.

---

## 3. Token estimation & abstraction

### Internally

You estimate:

- characters
- lines
- chunk size
- embedding calls
- LLM calls

But the user sees:

- **credits**, not tokens

Why?

- tokens are confusing
- credits feel controlled
- you can remap pricing later

---

## 4. AI caching (absolutely critical)

**Never charge twice for the same understanding.**

### Cache key design

- file hash
- snippet hash
- model version
- prompt version

If unchanged:

- reuse AI output
- cost = 0
- instant response

This ensures:

- speed
- fairness
- predictable costs

---

## 5. Credit exhaustion behavior (UX-sensitive)

When credits run low:

### Soft warning

> You have 10 AI credits remaining
> FileSense will continue to work, but new AI analysis will pause

### Hard stop (graceful)

- No crashes
- No broken app
- AI buttons disabled
- Search over existing understanding still works
- Clear “Add credits” CTA

This avoids the “pay or else” feeling.

---

# Purchasing AI credits (technical flow)

## Architecture goal

**No always-on backend, minimal surface area.**

---

## Purchase flow

1. User clicks **Add AI Credits**
2. App opens secure web checkout
3. User buys credit pack
4. User receives **signed credit bundle**
5. App imports credit bundle
6. Credits added locally

No account required.

---

## Credit bundle format (example)

```json
{
  "bundle_id": "FS-AI-1000-2026-01",
  "credits": 1000,
  "issued_at": "2026-01-20",
  "signature": "BASE64_SIGNATURE"
}
```

### Validation

- App verifies signature with embedded public key
- Credits are added atomically
- Bundle IDs prevent double-use

This is:

- offline-capable
- tamper-resistant
- simple to reason about

---

# AI usage visibility (must-have UI)

You **must** surface usage clearly.

### In-app AI dashboard

- Credits remaining
- Credits used this week
- What consumed credits
- Estimated cost of next action

This turns AI from “magic” into a **tool**.

---

# Version 1 – Functional spec (updated with AI credits)

### Free / Unlicensed

- Scan & index
- Search
- Preview organization
- Limited AI credits (starter pack)
- Multilingual UI

### Licensed

- Unlimited core features
- Higher AI credit allowance at start
- Ability to buy more credits
- Priority AI models

### Credit-based

- AI analysis
- Re-analysis
- Advanced planning
- Natural-language search interpretation

---

# Version 1 – Technical spec (updated)

### Desktop

- Tauri + Rust + React

### Local DB (SQLite)

- file_index
- ai_metadata
- ai_cache
- ai_credit_balance
- ai_usage_log
- plans
- transactions
- license_state

### AI layer

- Provider abstraction (OpenAI / Anthropic)
- Batch processing
- Credit estimation
- Caching
- Strict JSON schema output

### Monetization layer

- License verification
- Credit bundle verification
- FeatureGate
- AIUsageGuard (preflight checks)

---

# Why this model is _better_ than subscriptions

- Honest about AI cost
- Fair to light users
- Predictable for heavy users
- No forced accounts
- No cloud lock-in
- Aligns with privacy expectations
- Technically elegant

This is how **professional AI desktop software** should be built.

---

# Final confirmation (what you asked for)

✅ Yes, this model makes sense
✅ Yes, it aligns with premium LLM usage
✅ Yes, it is technically clean
✅ Yes, it is user-friendly
✅ Yes, it is trust-preserving
✅ Yes, it is portfolio-grade

You’ve landed on a **very strong architecture**.

---

## Next logical steps (choose one)

1. Define **AI credit pricing tiers**
2. Design the **AI Usage Dashboard UI**
3. Lock the **LLM prompt + schema contracts**
4. Draft the **user-facing AI explanation copy**
5. Create the **exact SQLite schema**
