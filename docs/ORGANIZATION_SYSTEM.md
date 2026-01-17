# Organization System Design

## Core UX Principle

**Never ask users to design a filing system.**

Instead:
1. Show them what you found (plain language + small numbers)
2. Recommend one default plan
3. Let them flip between 2-3 styles
4. Always provide Preview + Undo

---

## Three Organization Modes

### 1. Simple (Recommended) — "Life Domains"

Default for most users. Matches how humans think about their lives.

**Top-level folders (max 10):**

| Folder | What goes here |
|--------|----------------|
| Health | Medical, dental, vision, therapy, prescriptions, labs |
| Money | Banking, budgeting, taxes, investments, receipts |
| Legal | Contracts, disputes, IDs, notarized docs |
| Home | Mortgage/rent, utilities, repairs, HOA, appliances |
| Work | Employment, clients, projects, professional docs |
| Education | Courses, certificates, transcripts, training |
| Family | Kids/school, spouse docs, elders, family records |
| Travel | Bookings, visas, itineraries, loyalty programs |
| Identity | Passport, SSN/CURP, birth certs, immigration |
| Personal Admin | Subscriptions, memberships, warranties, misc |

**Guardrails:**
- Depth limit: 2 levels max
- Example: `Money/Taxes/...` or `Work/Clients/...`

---

### 2. Timeline — "By Date"

For users who think in terms of "when" not "what."

**Structure:**
- `2026/...`
- `2025/...`
- `2024/...`
- `Older/...`

**Guardrails:**
- Only add Month subfolders if >30 files in that month
- Otherwise keep at year level to avoid micro-folders

---

### 3. Smart Groups — "AI Collections"

The "wow" mode, but strictly constrained.

**How it works:**
- AI proposes 6-12 groups max with human-friendly names
- Every group maps to a known "safe parent" domain
- Anything uncertain goes to `Review`

**Example output:**
- `Work/Invoices`
- `Money/Bank Statements`
- `Home/Warranties`
- `Identity/Immigration`
- `Travel/Bookings`

**Guardrails:**
- No abstract categories like "Personal Growth Artifacts"
- No nesting deeper than 2 levels
- Low confidence → route to `Review`

---

## Confidence-Based Routing

| Confidence | Action |
|------------|--------|
| High (≥0.8) | Auto-file |
| Medium (0.6-0.8) | Auto-file, mark "verify" (optional) |
| Low (<0.6) | Put in `Review` folder |

**Review folder structure:**
- `Review/Needs Category`
- `Review/Duplicates`
- `Review/Unknown Type`

---

## Guardrails (Non-Negotiable)

| Rule | Value |
|------|-------|
| Max top-level folders | 10-12 |
| Max depth | 2 levels (3 only for Work/Projects if needed) |
| Min files per folder | 5 (otherwise merge into parent) |
| Always include | `Review` folder |

---

## AI Category Mapping

Map AI classification categories to Life Domains:

| AI Category | Life Domain | Subcategory Examples |
|-------------|-------------|---------------------|
| Medical | Health | Records, Insurance, Prescriptions |
| Financial | Money | Banking, Taxes, Receipts, Investments |
| Legal | Legal | Contracts, Agreements, Disputes |
| School | Education | Courses, Transcripts, Certificates |
| Work | Work | Projects, Clients, Employment |
| Personal | Personal Admin | Subscriptions, Warranties, Misc |
| Code | Work | Development, Projects |
| Documents | (route by content) | Various |
| Images | (route by content) | Photos, Screenshots |
| Other | Review | Needs Category |

---

## User-Facing Copy

### Mode Selection Screen

**Pick your cleanup style**

- **Simple (Recommended)**
  "Organize by everyday categories like Work, Money, Health."

- **By Date**
  "Organize by year (and month if needed)."

- **Smart Groups**
  "AI creates the best categories. Anything uncertain goes to Review."

### Preview Screen

**Summary section:**
- "1,248 files found in Desktop + Downloads"
- "1,010 will be organized"
- "238 will stay where they are"
- "64 need review"

**Top destinations:**
- Work (320)
- Money (210)
- Personal Admin (190)
- Home (130)
- Education (90)
- Review (64)

**Safety controls:**
- ✅ Create a restore point (Undo)
- ✅ Don't move folders, only files (default on)
- ✅ Leave anything opened recently - last 7 days (optional)

---

## Smart Default Selection

Recommend style based on detected files:

| Detection | Recommended Style |
|-----------|------------------|
| Strong timestamps, mixed types | By Date |
| Many PDFs/docs/contracts | Simple |
| Lots of receipts/invoices | Smart Groups |
| Unknown/mixed | Simple (safest default) |

---

## Implementation Checklist

### Phase 1: Update Categories
- [ ] Replace current Category enum with Life Domains
- [ ] Update AI prompt to classify into Life Domains
- [ ] Add confidence thresholds for Review routing

### Phase 2: Update Organization Styles
- [ ] Rename "Life Areas" → "Simple"
- [ ] Keep "Timeline" as-is
- [ ] Constrain "Projects" → "Smart Groups" with limits

### Phase 3: Add Guardrails
- [ ] Implement max depth check
- [ ] Implement min files per folder (merge small categories)
- [ ] Always create Review folder

### Phase 4: Update UI
- [ ] New mode selection copy
- [ ] Preview screen with summary
- [ ] Safety controls checkboxes
