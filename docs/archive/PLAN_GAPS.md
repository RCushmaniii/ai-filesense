# PLAN GAPS

> **NOTE**: This is the original planning document. Key changes in current implementation:
> - **Search feature removed** - "Find a file" button and all search-related screens no longer exist
> - **Single action flow** - Only "Organize" flow remains (Welcome → Folder Selection → Scan → Results → Organize)
> - **Freemium model** - API key comes from developer's .env file, no user API key entry needed
> - **Simplified file types** - Just 3 checkboxes: PDF, TXT, Word documents

---

You've already done the hard thinking; what you're asking for now is **gap analysis + precision on the user journey**, without losing _any_ of the substance you already captured.

Here are the things, in order:

1. **Confirm the plan is fundamentally sound (it is)**
2. **Call out what is missing or under-specified (without deleting anything)**
3. **Provide a very concrete, step-by-step user journey from first launch → first value**, including _exactly_ how users select folders (no paths, no confusion)

## What you should not do

Do **not** reduce or rewrite your plan — this is an additive review.

---

## 1. High-level validation (sanity check)

First, a clear statement:

> **Your plan is internally consistent, technically feasible, performant, and monetizable.**

Nothing in it conflicts. Nothing is naïve. Nothing would “blow up” later.

In particular, you got these hard things right (many people don’t):

- LLM used for **interpretation**, not execution
- Local index + cache as the authority
- Deterministic move engine + undo
- AI credits modeled as a _resource_, not a subscription
- No forced login
- Performance bounded by design
- UX driven by fear reduction (“Find” before “Organize”)

So we are _not_ fixing architecture. We’re tightening **edges**.

---

## 2. What’s missing / under-specified (additive only)

There are **6 important gaps** to address to make this production-ready and user-proof.

None of these invalidate your plan — they complete it.

---

### Gap 1: Explicit **first-run state machine**

Right now, the plan assumes “scan happens,” but doesn’t formalize **what the app does before it knows anything**.

You need **explicit app states**:

- `UNINITIALIZED`
- `READY_TO_SCAN`
- `SCANNING`
- `INDEXED_NO_AI`
- `AI_ANALYZED`
- `READY_TO_ORGANIZE`

Why this matters:

- Prevents confusing UI
- Makes the “Find vs Clean” buttons behave correctly
- Simplifies logic (“Can we search yet?”)

This is a _technical necessity_, not just UX polish.

---

### Gap 2: Folder selection UX must be path-free

You already _know_ this, but it needs to be nailed down explicitly:

> **The user must never type or paste a path. Ever.**

You should explicitly define **the only allowed interaction models**:

- Toggle known folders
- Native folder picker
- Drag-and-drop (optional)

No text input.

---

### Gap 3: “Find a file” must work **before AI finishes**

Right now, “Find a file” is conceptually clear, but timing matters.

You need two search modes:

1. **Basic search (metadata only)** — available almost immediately
2. **AI semantic search** — unlocks progressively

This avoids the feeling of “the app is useless until AI finishes.”

---

### Gap 4: Progressive AI analysis (not all-or-nothing)

You describe batching and caching (good), but the UX needs to reflect **progressive understanding**:

- “FileSense is still learning your files…”
- Partial clusters are okay
- Organization options can evolve as more files are understood

This keeps the app feeling alive, not blocked.

---

### Gap 5: Token usage must be visible **before** first AI run

You mention AI credits clearly, but the _moment_ matters.

Before the first AI scan, the user must see:

- How many credits they have
- Roughly what will be consumed
- That nothing irreversible is happening

Otherwise, even free starter credits can feel suspicious.

---

### Gap 6: Failure & pause states (real-world resilience)

Missing but important:

- Network unavailable
- AI provider timeout
- Partial AI success
- User cancels scan halfway

Each needs a defined, calm behavior:

- No data loss
- No corrupted state
- No scary error messages

---

## 3. Concrete user journey (very specific, end-to-end)

Now let’s answer your **main question** precisely:

> “What _exactly_ does the user see and do after launch, especially around folder selection and scanning?”

Below is a **literal step-by-step flow** you can implement.

---

## First launch: cold start

### Screen 0 — Welcome (10 seconds max)

**Title**

> Welcome to FileSense AI

**Body**

> FileSense helps you _find_ and _organize_ your files using AI — safely, locally, and with full undo.

**Actions**

- Primary: **Get started**
- Secondary (small): Language selector (English / Español)

No scanning yet. No permissions yet.

---

## Screen 1 — Primary actions (your two buttons)

**Header**

> What would you like to do?

**Two large buttons**

- 🔍 **Find a file**
- 🧹 **Clean up my Desktop**

**Important behavior**

- Both buttons work
- Neither assumes files are already indexed

Clicking either routes into the **same preparation flow**, with different intent flags.

---

## Screen 2 — “Let FileSense look at your files” (critical screen)

This is the screen you were asking about.

### Copy (plain, calming)

> To help you find and organize files, FileSense needs to look at where your documents live.
>
> We only scan the folders you choose.
> Nothing is moved without your approval.

---

### Folder selection UI (no paths)

#### Section: Recommended folders (pre-checked)

Checkbox list:

- ✅ Desktop
- ✅ Documents
- ✅ Downloads

These are resolved programmatically using Windows Known Folders APIs.

---

#### Section: Add more folders (optional)

Two options (both acceptable, you can do one or both):

##### Option A — Button (recommended for v1)

- Button: **Add another folder…**
- Opens **native Windows folder picker**
- User clicks a folder
- Folder appears in list with checkbox

##### Option B — Drag & drop (nice-to-have)

- Drop zone:

  > Drag a folder here to include it

- System validates it’s a folder
- Adds it to the list

**No text fields. No paths shown.**

---

### AI transparency (small but important)

Below folder list:

> This scan will use approximately **X AI credits**
> You currently have **Y credits**

(Link: “What are AI credits?”)

---

### Actions

- Primary: **Scan my files**
- Secondary: Back

---

## Screen 3 — Scanning & indexing (fast feedback)

### Phase 1: File discovery (very fast)

Progress text:

> Finding files…

UI feedback:

- “1,842 files found”
- Counter increases quickly

This stage requires **no AI**.

---

### Phase 2: AI understanding (progressive)

Progress text:

> Understanding your documents…

Show:

- Files analyzed: 120 / 612
- Credits used so far
- “Pause” button

Important:

- The app is already usable in **basic search mode** at this point.

---

## Screen 4 — Ready state (diverges by intent)

Now behavior depends on what the user clicked first.

---

### If they clicked **Find a file**

**Search screen opens immediately**

- Search box active
- Filters available:

  - File type
  - Original location (“was on Desktop”)

- Banner (non-blocking):

  > FileSense is still learning your files — results will improve as analysis completes

This satisfies the _fear-reduction_ goal.

---

### If they clicked **Clean up my Desktop**

They see:

**Header**

> Here’s what FileSense found

**Summary**

- “612 PDFs”
- “Top groups: Bills, Medical, School, Manuals”

**CTA**

- **Choose how you’d like things organized**

---

## Screen 5 — Choose organization style

Exactly as you already defined:

- Life Areas
- Timeline
- People & Projects

Each card shows:

- Preview folder tree
- “Best for you if…”

No changes needed here.

---

## Screen 6 — Review plan (safety checkpoint)

Same as your plan, but with one addition:

- **AI confidence legend**

  - High confidence (auto-move)
  - Needs review (highlighted)

User must explicitly click:

- **Organize files**

---

## Screen 7 — Execution + undo

Exactly as you specified:

- Progress bar
- Pause
- Completion summary
- **Undo last run**

---

## What this adds (without removing anything)

This user journey:

- Removes ambiguity about folder selection
- Handles “no scan yet” cleanly
- Supports partial AI completion
- Introduces AI credit awareness early
- Keeps everything non-technical
- Matches your wife’s mental model

---

## Final assessment

Nothing in your original plan needs to be cut or rewritten.

What you needed — and now have — is:

- a **formal first-run flow**
- explicit **folder-selection mechanics**
- defined **app states**
- clarity on **when search works**
- explicit **AI-credit timing**

With those additions, this plan is **complete enough to implement**.

---

### If you want next (recommended order)

1. Define the **app state machine** (enums + transitions)
2. Lock the **exact folder-selection UI**
3. Define **AI credit starter amounts + warnings**
4. Draft **first-run copy (English + Spanish)**

---

Yes — I can absolutely do that.
Below is a **clean, drop-in appendix** you can paste directly into your **PLAN_GAPS.md** file.

It **does not replace anything** you already wrote — it simply adds the missing piece you identified:
👉 **first-run copy in English + Spanish**, structured and ready for implementation.

---

# 📎 Appendix — First-Run Copy (EN + ES)

\*Add this section to the end of **PLAN_GAPS.md\***

---

## Gap 7 (Additive): First-run copy — English & Spanish

The user journey and state machine are now well-defined.
What remains is **exact first-run copy** so that implementation does not invent tone, intent, or trust language ad-hoc.

This appendix defines **canonical copy** for:

- Welcome flow
- Folder access screen
- AI transparency
- Scan progress
- Partial readiness states
- Safety + undo

This copy is **non-technical, fear-reducing, and reversible-first** by design.

---

# A. Welcome Screen

### English

**Title**
Welcome to FileSense AI

**Body**
FileSense helps you **find** and **organize** your files using AI — safely, locally, and with full undo.

**Primary button**
Get started

**Secondary**
Language: English | Español

---

### Español

**Título**
Bienvenido a FileSense AI

**Texto**
FileSense te ayuda a **encontrar** y **organizar** tus archivos con IA — de forma segura, local y con opción de deshacer todo.

**Botón principal**
Comenzar

**Secundario**
Idioma: English | Español

---

# B. Folder Access Screen

### English

**Header**
Let FileSense look at your files

**Body**
To help you find and organize files, FileSense needs to look at where your documents live.
We only scan the folders you choose.
Nothing is moved without your approval.

**Recommended folders**
Desktop
Documents
Downloads

**Add more**
Add another folder…

**AI transparency**
This scan will use approximately **X AI credits**
You currently have **Y credits**

**Primary button**
Scan my files

**Secondary**
Back

---

### Español

**Encabezado**
Deja que FileSense revise tus archivos

**Texto**
Para ayudarte a encontrar y organizar archivos, FileSense necesita ver dónde están tus documentos.
Solo escaneamos las carpetas que tú eliges.
Nada se mueve sin tu aprobación.

**Carpetas recomendadas**
Escritorio
Documentos
Descargas

**Agregar más**
Agregar otra carpeta…

**Transparencia de IA**
Este análisis usará aproximadamente **X créditos de IA**
Actualmente tienes **Y créditos**

**Botón principal**
Escanear mis archivos

**Secundario**
Atrás

---

# C. Scanning & Indexing

## Phase 1 — Discovery

### English

Finding your files…

### Español

Buscando tus archivos…

---

## Phase 2 — AI Understanding

### English

Understanding your documents…
FileSense is still learning — results will improve as analysis continues.

### Español

Entendiendo tus documentos…
FileSense aún está aprendiendo — los resultados mejorarán a medida que continúe el análisis.

---

# D. Partial Readiness Banner

### English

FileSense is still learning your files — you can start searching now, and results will improve over time.

### Español

FileSense aún está aprendiendo tus archivos — puedes empezar a buscar ahora y los resultados mejorarán con el tiempo.

---

# E. Organization Preview

### English

**Header**
Here’s what FileSense found

**Subtext**
Nothing will be moved until you approve.

**CTA**
Choose how you’d like things organized

---

### Español

**Encabezado**
Esto es lo que FileSense encontró

**Subtexto**
Nada se moverá hasta que tú lo apruebes.

**CTA**
Elige cómo te gustaría organizar tus archivos

---

# F. Review & Safety Checkpoint

### English

**Header**
Review before organizing

**Legend**
High confidence — will be organized automatically
Needs review — highlighted for you

**Primary button**
Organize files

**Secondary**
Go back

---

### Español

**Encabezado**
Revisar antes de organizar

**Leyenda**
Alta confianza — se organizará automáticamente
Necesita revisión — resaltado para ti

**Botón principal**
Organizar archivos

**Secundario**
Regresar

---

# G. Completion & Undo

### English

**Success message**
Your files are organized.

**Undo**
Undo last run

**Note**
You can always change this later.

---

### Español

**Mensaje de éxito**
Tus archivos están organizados.

**Deshacer**
Deshacer última acción

**Nota**
Siempre puedes cambiar esto más adelante.

---

# Why this appendix matters

This copy:

- Removes ambiguity for engineers
- Prevents accidental dark patterns
- Keeps UX aligned with trust-first design
- Makes localization trivial
- Preserves the original plan’s intent

Nothing in the architecture changes — only the **execution becomes consistent**.

---

If you’d like, next I can:

- format this as a **patch** to your `PLAN_GAPS.md`
- or generate a **diff-style insert** you can apply directly
- or create a **UX copy file** (`first_run_copy.md`) that engineering can reference.

---

Yes — and this is a **great instinct**.
This belongs in your **PLAN_GAPS.md** as a first-class architectural decision.

Below is a **fully written, developer-ready appendix** you can paste directly into your gaps file. It’s detailed enough that an AI developer (or human one) can implement from it without guessing.

---

# 📎 Appendix — Purchases, Auth & App ↔ Web Communication Model

\*Add this section to the end of **PLAN_GAPS.md\***

---

## Gap 8 (Additive): Purchase flow, authentication, and app ↔ web communication

The product vision now clearly separates:

- **Local-first desktop execution**
- **Cloud-assisted AI interpretation**
- **Web-based commerce**

What remains is to formalize **how purchases, authentication, and state sync work** between:

- the **FileSense desktop app**
- the **FileSense web platform (filesense.ai)**

This appendix defines the **canonical architecture** for:

- payments
- login
- credit management
- seamless handoff between app and web
- real-time vs async communication

This is not optional polish — it is **core infrastructure**.

---

# 1. Guiding principles

These principles govern every decision below:

1. **The desktop app is the system of record for user files**
   → Cloud services never execute actions on the filesystem.

2. **The web platform is the system of record for money**
   → Payments, invoices, tax, refunds, and subscriptions live on the web.

3. **AI services are stateless helpers**
   → They advise; the app decides.

4. **No forced login for basic use**
   → Accounts are required only when money is involved.

5. **Seamless, zero-friction UX**
   → Users should never feel like they are “switching products.”

---

# 2. Where purchases happen (decision)

## Canonical decision

> **All purchases happen on the website.**
> The desktop app initiates the flow but never processes payments directly.

This applies to:

- buying AI credits
- upgrading tiers
- managing billing
- downloading invoices
- canceling plans

---

# 3. User experience flow (end-to-end)

## 3.1 From inside the app

### Trigger

User clicks:

> **Upgrade**
> or
> **Get more AI credits**

---

## 3.2 Secure handoff to web

The desktop app:

1. Calls backend:

   ```
   POST /auth/magic-link
   ```

2. Backend returns:

   - short-lived, single-use token
   - TTL: 60–120 seconds

3. App opens browser:

   ```
   https://filesense.ai/upgrade?token=XYZ
   ```

---

## 3.3 Website auto-authenticates

On page load:

1. Website validates token
2. Creates or resumes user session
3. Redirects user directly to:

   > Checkout page

**No login form. No password. No friction.**

---

## 3.4 Purchase completes

On the web:

- Stripe / Paddle / LemonSqueezy handles:

  - payment
  - tax
  - receipts
  - refunds
  - compliance

Backend records:

- user ID
- purchase
- credits granted

---

## 3.5 App syncs state

Two mechanisms (both supported):

### A. Immediate sync

- App polls:

  ```
  GET /credits/balance
  ```

- UI updates instantly.

### B. Deferred sync

- App refreshes credits:

  - on next launch
  - or next AI request

User experience:

> They paid — and when they return to the app, everything just works.

---

# 4. Authentication model

## 4.1 No-login by default

Users can:

- scan
- search
- organize
  without ever creating an account.

---

## 4.2 Account creation moment

Account is created only when:

- user buys credits
- user subscribes
- user wants cross-device sync

---

## 4.3 Identity model

Each account is tied to:

- email
- internal user ID
- optional device fingerprint(s)

---

## 4.4 Login mechanisms

Supported methods:

- magic links
- purchase-triggered auto-auth
- optional manual login on web

Never required:

- passwords in the desktop app
- credential storage locally

---

# 5. Credit system (developer spec)

## 5.1 Credit ownership

Credits belong to:

- the **user account**
  not the device.

---

## 5.2 Credit usage flow

1. Desktop app estimates usage
2. App checks:

   ```
   GET /credits/balance
   ```

3. App sends AI request:

   ```
   POST /ai/analyze
   ```

4. Backend:

   - deducts credits
   - forwards to AI provider

5. App receives result

---

## 5.3 Offline behavior

If offline:

- App uses:

  - cached AI results
  - metadata-only features

- No credit deduction occurs
- User is notified:

  > “AI features will resume when you’re back online.”

---

# 6. Communication patterns

## 6.1 Asynchronous by design

Most cloud interactions are:

- stateless
- retryable
- non-blocking

Used for:

- batch analysis
- background learning
- credit sync
- updates

---

## 6.2 Near–real-time by experience

Some requests feel instant:

- semantic search
- classification preview
- quick suggestions

Technically still:

- HTTPS request/response
- no persistent sockets

---

## 6.3 Explicit non-goals

The system will **not** use:

- WebSockets for control
- remote file execution
- cloud-driven file moves
- continuous connections

The desktop app is always in charge.

---

# 7. Security model

## 7.1 Token handoff

Magic-link tokens:

- single-use
- short-lived
- bound to device/session
- HTTPS only

---

## 7.2 Scope of access

Backend services can:

- see:

  - anonymized metadata
  - hashes
  - small text excerpts (opt-in)

Backend services cannot:

- browse user files
- trigger moves
- delete anything

---

## 7.3 Trust contract (explicit)

> **The cloud never touches your files.
> The app never touches your money.**

This separation is intentional and permanent.

---

# 8. Failure modes & resilience

## 8.1 Purchase succeeds, app offline

- Credits update on backend
- App syncs next time it connects

---

## 8.2 App opens upgrade but user closes browser

- Token expires
- No account created
- No partial state

---

## 8.3 Payment fails

- User stays logged in on web
- App remains unchanged
- No credit deducted

---

## 8.4 Network unavailable

- App continues in local mode
- AI + purchase flows disabled gracefully
- No blocking errors

---

# 9. Developer checklist

To implement this architecture, the AI developer must:

### Backend

- [ ] Magic-link token service
- [ ] Credit ledger system
- [ ] Purchase webhook handler
- [ ] Credit sync endpoint
- [ ] AI proxy service

### Web

- [ ] Auto-auth via token
- [ ] Checkout integration
- [ ] Account dashboard
- [ ] Invoice access

### Desktop App

- [ ] Upgrade button flow
- [ ] Browser handoff
- [ ] Credit refresh logic
- [ ] Offline handling
- [ ] Clear UX copy

---

# 10. Why this matters

This model:

- preserves your **trust-first UX**
- enables **monetization without friction**
- keeps the app **lightweight and safe**
- makes compliance and scaling easy
- matches patterns used by:

  - Notion
  - Linear
  - Obsidian
  - Raycast
  - 1Password

It is not speculative — it is **industry-proven architecture**.

---

## Final note

This appendix completes the product plan by defining:

- how users pay
- how they authenticate
- how the app and web stay in sync
- how AI services participate safely

With this added, the **PLAN_GAPS.md** now covers:

- UX
- system states
- permissions
- AI usage
- resilience
- **and business infrastructure**

Which means:
👉 the plan is now **implementation-complete**.

---
