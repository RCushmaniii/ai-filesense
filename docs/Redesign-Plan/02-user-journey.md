# User Journey

> **Document:** 02-user-journey.md  
> **Purpose:** Define the end-to-end experience from first launch to ongoing habit

---

## Journey Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: FIRST WIN                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │ Welcome  │──▶│ Location │──▶│  Scan +  │──▶│ Results  │        │
│  │ File Type│   │ Selection│   │Personalize│   │ Preview  │        │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘        │
│     Screen 1      Screen 2      Screen 3       Screen 4            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: REVIEW + APPROVE                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
│  │ Detailed │──▶│  Quick   │──▶│ Applying │──▶│ Success  │        │
│  │  Review  │   │  Fixes   │   │ Changes  │   │          │        │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘        │
│     Screen 5      Screen 6      Screen 7       Screen 8            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       PHASE 3: ONGOING HABIT                        │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                      Dashboard                            │      │
│  │   • Review folder inbox                                   │      │
│  │   • Weekly tidy prompts                                   │      │
│  │   • Auto-organize (optional)                              │      │
│  └──────────────────────────────────────────────────────────┘      │
│     Screen 9                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: First Launch → First Win

### Screen 1: Welcome / File Type Selection

**Purpose:** First decision point. Establish trust immediately.

**What user sees:**
- Big buttons for file types (PDF, Word, Text, All Documents)
- "All Documents" highlighted as recommended
- Trust statement: "Nothing moves until you approve"
- Small "Advanced options" link

**What user does:**
- Select file type(s) to organize (default: All Documents)
- Click Continue

**Key microcopy:**
- "Start simple. You can change this later."
- "Your files stay on your computer. Nothing moves until you approve."

---

### Screen 2: Location Selection

**Purpose:** Confirm where to scan. Smart defaults reduce friction.

**What user sees:**
- Checkboxes for common locations (Documents, Desktop, Downloads)
- File count estimates per location
- "Include subfolders" toggle (default: ON)
- Total document estimate

**What user does:**
- Confirm locations (defaults usually work)
- Optionally add custom folder
- Click "Scan Now"

**Key microcopy:**
- "Ready to scan approximately 1,671 documents"

---

### Screen 3: Scan Progress + Optional Personalization

**Purpose:** Time feels productive. Collect optional context.

**What user sees:**
- Progress bar with file count
- Optional personalization question (clickable chips)
- "Skip" option always visible

**What user does:**
- Wait for scan (typically 30-60 seconds)
- Optionally select user type or skip
- Auto-advances when complete

**Key microcopy:**
- "While we scan, help us organize better (optional)"
- "Skip—just organize →"

---

### Screen 4: Results Preview + Plan Recommendation

**Purpose:** The "wow" moment. Build confidence.

**What user sees:**
- Summary: "1,584 documents can be organized"
- Bar chart showing distribution by folder
- Recommended mode (preselected)
- Mode switcher (Simple / By Date / By Project)
- Review count notice

**What user does:**
- Review the proposed plan
- Optionally switch modes
- Click "Review Changes"

**Key microcopy:**
- "Recommended for most people. You can adjust later."
- "176 documents need your review (low confidence)"

---

## Phase 2: Review → Approve with Confidence

### Screen 5: Detailed Review

**Purpose:** Trust-critical screen. Show exactly what will happen.

**What user sees:**
- Left panel: Folder tree with counts
- Right panel: File list with destinations
- Confidence indicators (High/Medium/Low)
- Brief reason for each classification

**What user does:**
- Browse proposed changes
- Optionally adjust individual files
- Check confirmation checkbox
- Click "Apply Organization"

**Key microcopy:**
- "You're in control. Review before anything changes."
- "I understand files will be moved (undo available)"
- Confidence reasons: "Filename contains 'Invoice'"

---

### Screen 6: Quick Fixes (Optional)

**Purpose:** Improve results without reviewing everything.

**What user sees:**
- Progress indicator (1 of 3)
- Entity or pattern detected
- Sample files affected
- Simple choice buttons

**What user does:**
- Answer 2-3 quick questions (or skip all)
- Each answer improves classification for many files

**Key microcopy:**
- "Is 'Acme' a... Work (employer) / Client / Skip"
- "Skip all → Apply anyway"

**Rules:**
- Maximum 5 questions
- Always allow "Skip"
- Only ask about high-impact patterns

---

### Screen 7: Applying Changes

**Purpose:** Show progress, provide emergency stop.

**What user sees:**
- Progress bar with file count
- Current file being moved
- "Stop" button (emergency)
- Safety indicators (log created, undo available)

**What user does:**
- Wait (or stop if needed)
- Auto-advances when complete

**Key microcopy:**
- "Organizing your documents..."
- "Stop (undo what's done so far)"
- "✓ Creating activity log for undo"

---

### Screen 8: Success / Completion

**Purpose:** Celebrate. Provide next actions.

**What user sees:**
- Success checkmark
- Stats: folders created, docs organized, time saved
- Primary action: "Open Organized Folder"
- Secondary actions: Undo, View Log, Set up Auto-Organize

**What user does:**
- Celebrate!
- Open folder to see results
- Optionally enable auto-organize
- Click Done

**Key microcopy:**
- "Your documents are organized!"
- "Time saved: ~4 hours of manual sorting"
- "Tip: 176 documents are in your Review folder."

---

## Phase 3: Ongoing Habit

### Screen 9: Dashboard

**Purpose:** Home base for ongoing maintenance.

**What user sees:**
- Review folder card with item count
- Quick Sort button with time estimate
- Folder grid showing organized structure
- Auto-organize status and toggle

**What user does:**
- Periodically sort Review folder items
- Respond to weekly prompts
- Adjust settings as needed

**Habit Loop:**
- New docs go to Review (or auto-organized)
- Weekly prompt: "Want me to tidy your Inbox? (2 minutes)"
- Low friction keeps users engaged

---

## What the App Does Automatically vs. User Input

### Automatic (No User Input Required)

| Action | Details |
|--------|---------|
| Scan locations | Enumerates files in selected folders |
| Detect patterns | Document type, topic, date, entities |
| Propose organization | Generates plan based on scan + context |
| Provide preview | Shows exactly what will happen |
| Create folders | Builds folder structure on apply |
| Move files | Executes approved plan |
| Keep activity log | Records every action for undo |

### User Input (Minimal)

| Decision | Default Provided? |
|----------|-------------------|
| File types to organize | Yes (All Documents) |
| Folders to scan | Yes (Documents, Desktop, Downloads) |
| Organization mode | Yes (Simple recommended) |
| Approve changes | Required (but "Approve all" is safe) |

---

## Overwhelm Prevention

| Overwhelm Trigger | Prevention Strategy |
|-------------------|---------------------|
| Too many choices upfront | Presets + one recommended path |
| Fear of losing files | Preview, "nothing moves until approve," undo, logs |
| Perfection trap ("review everything") | "Approve all safely" + minimal "fix a few" prompts |
| Complex folder trees | 2-layer system maximum |
| Technical jargon | Plain language, brief explanations |
| Long processes | Progress indicators, time estimates |

---

## Key Microcopy Examples

### Trust-Building
- "You're in control. Review before anything changes."
- "Nothing will be moved until you approve."
- "Undo anytime"

### Encouraging Progress
- "Start simple. You can change this later."
- "Recommended for most people."
- "Skip this—your files stay as-is."

### Explaining AI Decisions
- "High confidence: 'Invoice' detected in filename"
- "Medium: Based on keywords in document"
- "We'll start with a simple structure. You can refine later."

### Celebrating Success
- "Your documents are organized!"
- "Time saved: ~4 hours of manual sorting"

---

## Metrics to Validate the Journey

### Activation (First Session)

| Metric | Target | Red Flag |
|--------|--------|----------|
| % reaching Preview screen | >80% | <60% |
| % clicking Apply | >60% | <40% |
| Time-to-first-organization | <5 min | >10 min |

### Trust & Confidence

| Metric | Target | Notes |
|--------|--------|-------|
| Undo rate (first week) | <20% | Some undo is healthy |
| Abandon on Review screen | <15% | Critical drop-off point |
| "Approve all" usage | >70% | Indicates trust |

### Outcome Quality

| Metric | Target | Notes |
|--------|--------|-------|
| % in Review after first run | <15% | Lower = better AI |
| User edits to suggestions | <10% | Lower = better AI |

### Retention

| Metric | Target | Notes |
|--------|--------|-------|
| Review folder action within 7 days | >40% | Habit forming |
| Auto-organize adoption | >25% | Optional success |
| Return within 30 days | >50% | Ongoing value |
