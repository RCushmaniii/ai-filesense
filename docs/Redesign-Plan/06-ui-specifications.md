# UI Screen Specifications

> **Document:** 06-ui-specifications.md  
> **Purpose:** Detailed specs for all application screens

---

## Screen Index

| # | Screen | Phase | Purpose |
|---|--------|-------|---------|
| 1 | Welcome / File Type Selection | First Win | First decision + trust |
| 2 | Location Selection | First Win | Choose scan locations |
| 3 | Scan Progress + Personalization | First Win | Time feels productive |
| 4 | Results Preview | First Win | The "wow" moment |
| 5 | Detailed Review | Review | Trust-critical |
| 6 | Quick Fixes | Review | Optional improvement |
| 7 | Applying Changes | Review | Progress + safety |
| 8 | Success | Review | Celebrate + next steps |
| 9 | Dashboard | Ongoing | Home base |

---

## Screen 1: Welcome / File Type Selection

### Purpose
First decision point. User chooses what to organize. Establishes trust immediately.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              [App Logo]                                     │
│                                                             │
│         Let's get your documents organized                  │
│                                                             │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│    │   📄 PDF    │  │   📝 Word   │  │   📃 Text   │       │
│    │   files     │  │   docs      │  │   files     │       │
│    └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│              ┌───────────────────────┐                      │
│              │   📚 All Documents    │  ← Highlighted       │
│              │      (recommended)    │                      │
│              └───────────────────────┘                      │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│    🔒 Your files stay on your computer.                     │
│       Nothing moves until you approve.                      │
│                                                             │
│                               [ Advanced options ]  (link)  │
│                                                             │
│                         [ Continue → ]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| File type buttons | Toggle group (multi-select) | Select 1+ types; "All Documents" auto-selects all |
| "All Documents" button | Primary selection | Larger, visually emphasized; preselected |
| Trust statement | Static text | Always visible; lock icon |
| Advanced options | Text link | Expands: exclude folders, file size limits, date range |
| Continue button | Primary CTA | Disabled until selection (default: enabled) |

### States

| State | Appearance |
|-------|------------|
| Default | "All Documents" selected, Continue enabled |
| Single type selected | That button highlighted, "All" unselected |
| Multiple types | Multiple buttons highlighted |
| Advanced expanded | Panel slides down |

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Let's get your documents organized" |
| Subhead | "Pick what you want to organize—you can always do more later." |
| Trust line | "Your files stay on your computer. Nothing moves until you approve." |
| Continue button | "Continue →" |
| Advanced link | "Advanced options" |

---

## Screen 2: Location Selection

### Purpose
User confirms where to scan. Smart defaults reduce friction.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ← Back                                                     │
│                                                             │
│         Where are your documents?                           │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │  ☑️  Documents                                     │   │
│    │      C:\Users\Maria\Documents                     │   │
│    │      ~1,240 files                                 │   │
│    ├───────────────────────────────────────────────────┤   │
│    │  ☑️  Desktop                                       │   │
│    │      C:\Users\Maria\Desktop                       │   │
│    │      ~89 files                                    │   │
│    ├───────────────────────────────────────────────────┤   │
│    │  ☑️  Downloads                                     │   │
│    │      C:\Users\Maria\Downloads                     │   │
│    │      ~342 files                                   │   │
│    ├───────────────────────────────────────────────────┤   │
│    │  ☐  Add another folder...                         │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │  ☑️  Include subfolders                            │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    📊 Ready to scan approximately 1,671 documents           │
│                                                             │
│                         [ Scan Now → ]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Location checkboxes | Checkbox list | Pre-checked for common locations |
| File count preview | Dynamic text | Updates as checkboxes change |
| Add folder row | Checkbox + action | Opens native folder picker |
| Include subfolders | Toggle checkbox | Default ON |
| Total estimate | Dynamic text | Sum of selected locations |
| Scan Now button | Primary CTA | Initiates scan |
| Back button | Text link | Returns to Screen 1 |

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Where are your documents?" |
| Location format | "[Name] — [path] — ~[count] files" |
| Add folder | "Add another folder..." |
| Subfolder toggle | "Include subfolders" |
| Estimate | "Ready to scan approximately [X] documents" |
| Scan button | "Scan Now →" |

---

## Screen 3: Scan Progress + Optional Personalization

### Purpose
Scan runs while optionally collecting personalization. Time feels productive.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│         Analyzing your documents...                         │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │  ████████████████░░░░░░░░░░░░  47%                 │   │
│    │  Analyzed 784 of 1,671 documents                   │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│                                                             │
│    💡 While we scan, help us organize better (optional)     │
│                                                             │
│    What do you mostly use this computer for?                │
│                                                             │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│    │  🏠      │ │  🎓      │ │  💼      │ │  📸      │     │
│    │  Home &  │ │ Student  │ │  Work    │ │ Creative │     │
│    │  Family  │ │          │ │          │ │          │     │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│    │  🧑‍💼      │ │  🏪      │ │  👴      │ │  ✏️      │     │
│    │Freelancer│ │ Small    │ │ Retired  │ │  Other   │     │
│    │          │ │ Business │ │          │ │          │     │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│                                                             │
│    Or type your own: [________________________]             │
│                                                             │
│                              [ Skip—just organize → ]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Progress bar | Determinate | Shows % and file counts |
| User type chips | Single-select buttons | Tapping selects; can change |
| Free text input | Text field | Alternative to chips; 100 char limit |
| Skip link | Secondary action | Proceeds without personalization |

### States

| State | Appearance |
|-------|------------|
| Scanning (no selection) | Progress active; chips unselected |
| Scanning (selected) | Chip highlighted; waits for scan |
| Scan complete | Auto-advances after 3 seconds |

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Analyzing your documents..." |
| Progress | "Analyzed [X] of [Y] documents" |
| Prompt | "While we scan, help us organize better (optional)" |
| Question | "What do you mostly use this computer for?" |
| Skip | "Skip—just organize →" |

---

## Screen 4: Results Preview + Plan Recommendation

### Purpose
The "wow" moment. Show what AI found. Build confidence.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ← Back                                                     │
│                                                             │
│         ✅ Analysis complete                                │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │                                                   │   │
│    │   📊 1,584 documents can be organized             │   │
│    │                                                   │   │
│    │   ┌─────────────────────────────────────────┐    │   │
│    │   │  Work           ████████████   412      │    │   │
│    │   │  Money          ████████       298      │    │   │
│    │   │  Home           █████          187      │    │   │
│    │   │  Health         ████           156      │    │   │
│    │   │  School         ███            112      │    │   │
│    │   │  Archive        ██████         243      │    │   │
│    │   │  Review         ███            176      │    │   │
│    │   └─────────────────────────────────────────┘    │   │
│    │                                                   │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│                                                             │
│    Recommended: Simple Organization                         │
│    "Your documents span work and personal topics.           │
│     Simple folders keep everything easy to find."           │
│                                                             │
│    ┌─────────────────────────────────────────────────────┐ │
│    │  ◉ Simple        ○ By Date        ○ By Project     │ │
│    │    (recommended)                                    │ │
│    └─────────────────────────────────────────────────────┘ │
│                                                             │
│    ⓘ 176 documents need your review (low confidence)        │
│                                                             │
│                    [ Review Changes → ]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Summary card | Info panel | Total count + bar breakdown |
| Bar chart | Visualization | Proportional bars by folder |
| Mode selector | Radio group | Three options; one preselected |
| Explanation | Dynamic text | Changes with mode selection |
| Review notice | Info text | Shows if Review > 0 |
| Review Changes | Primary CTA | Proceeds to Screen 5 |

### Mode Options

| Mode | Label | Description |
|------|-------|-------------|
| Simple | "Simple" | Topic-based folders |
| By Date | "By Date" | Year-based folders |
| By Project | "By Project" | Client/project folders |

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Analysis complete" |
| Summary | "[X] documents can be organized" |
| Recommendation | "Recommended: [Mode]" |
| Review notice | "[X] documents need your review (low confidence)" |
| Button | "Review Changes →" |

---

## Screen 5: Detailed Review

### Purpose
Trust-critical. User sees exactly what will happen.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ← Back                                      [Undo] [Help]  │
│                                                             │
│         Review your organization plan                       │
│                                                             │
│  ┌─────────────────┬────────────────────────────────────┐  │
│  │                 │                                    │  │
│  │  FOLDERS        │  FILES                             │  │
│  │                 │                                    │  │
│  │  📁 Work (412)  │  ┌────────────────────────────┐   │  │
│  │    └ Projects   │  │ 📄 Q3_Report.docx          │   │  │
│  │    └ Reports    │  │    → Work/Reports          │   │  │
│  │                 │  │    ✓ High confidence       │   │  │
│  │  📁 Money (298) │  │    "Report" in filename    │   │  │
│  │    └ Invoices   │  │                            │   │  │
│  │    └ Taxes      │  │    [Keep] [Change folder ▾]│   │  │
│  │                 │  ├────────────────────────────┤   │  │
│  │  📁 Home (187)  │  │ 📄 Acme_Invoice_2025.pdf   │   │  │
│  │                 │  │    → Money/Invoices        │   │  │
│  │  📁 Health(156) │  │    ✓ High confidence       │   │  │
│  │                 │  │    "Invoice" detected      │   │  │
│  │  📁 School(112) │  │                            │   │  │
│  │                 │  │    [Keep] [Change folder ▾]│   │  │
│  │  📁 Archive     │  ├────────────────────────────┤   │  │
│  │    └ 2024       │  │ 📄 scan0042.pdf            │   │  │
│  │    └ 2023       │  │    → Health                │   │  │
│  │                 │  │    ◐ Medium confidence     │   │  │
│  │  📁 Review(176) │  │    "Medical terms via OCR" │   │  │
│  │     ⚠️ Needs     │  │                            │   │  │
│  │     attention   │  │    [Keep] [Change folder ▾]│   │  │
│  │                 │  └────────────────────────────┘   │  │
│  └─────────────────┴────────────────────────────────────┘  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ☑️ I understand files will be moved (undo available)       │
│                                                             │
│  [ Fix 12 flagged items ]          [ Apply Organization → ] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Folder tree | Navigation list | Click to filter; badges show count |
| File list | Scrollable list | File, destination, confidence, reason |
| Confidence indicator | Icon + text | ✓ High, ◐ Medium, ⚠️ Low |
| Keep button | Action | Confirms suggestion |
| Change dropdown | Dropdown | All folders + "Leave in place" |
| Confirmation checkbox | Checkbox | Required before Apply |
| Fix flagged button | Secondary CTA | Filters to low-confidence |
| Apply button | Primary CTA | Disabled until checkbox checked |

### Confidence Display

| Confidence | Icon | Color | Label |
|------------|------|-------|-------|
| ≥ 0.85 | ✓ | Green | "High confidence" |
| 0.70 – 0.84 | ◐ | Yellow | "Medium confidence" |
| 0.50 – 0.69 | ◐ | Orange | "Low confidence" |
| < 0.50 | ⚠️ | Red | "Needs review" |

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Review your organization plan" |
| Checkbox | "I understand files will be moved (undo available)" |
| Fix button | "Fix [X] flagged items" |
| Apply button | "Apply Organization →" |

---

## Screen 6: Quick Fixes (Optional)

### Purpose
Improve results without reviewing everything. 3-5 quick decisions.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ← Back                                                     │
│                                                             │
│         Quick fixes (optional)                              │
│         Answer a few questions to improve accuracy          │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │                                                   │   │
│    │  1 of 3                                          │   │
│    │                                                   │   │
│    │  These 34 documents mention "Acme"               │   │
│    │                                                   │   │
│    │  📄 Acme_Invoice_March.pdf                        │   │
│    │  📄 Acme_Contract_2024.docx                       │   │
│    │  📄 Acme_Proposal_Draft.docx                      │   │
│    │  + 31 more                                        │   │
│    │                                                   │   │
│    │  Is "Acme" a...                                   │   │
│    │                                                   │   │
│    │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│    │  │  Work    │  │  Client  │  │  Skip    │       │   │
│    │  │  (job)   │  │ (my      │  │          │       │   │
│    │  │          │  │  client) │  │          │       │   │
│    │  └──────────┘  └──────────┘  └──────────┘       │   │
│    │                                                   │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│                                                             │
│                    [ Skip all → Apply anyway ]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Progress | Step counter | "1 of 3" |
| Entity card | Info panel | Entity name + sample files |
| Choice buttons | Button group | Single-select; advances |
| Skip button | Per-question | Skips, moves to next |
| Skip all | Secondary action | Bypasses remaining |

### Rules

- Maximum 5 questions
- Only ask about entities affecting 10+ documents
- Always allow "Skip"

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Quick fixes (optional)" |
| Subhead | "Answer a few questions to improve accuracy" |
| Question | "Is '[Entity]' a..." |
| Skip all | "Skip all → Apply anyway" |

---

## Screen 7: Applying Changes

### Purpose
Show progress. Provide emergency stop. Build confidence.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│              Organizing your documents...                   │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │                                                   │   │
│    │         ████████████████████░░░░░  78%            │   │
│    │                                                   │   │
│    │         Moving file 1,235 of 1,584               │   │
│    │                                                   │   │
│    │         📄 Quarterly_Report_Q3.docx               │   │
│    │            → Work/Reports                         │   │
│    │                                                   │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│              ┌─────────────────────────┐                   │
│              │   ⏹️ Stop (undo what's   │                   │
│              │      done so far)       │                   │
│              └─────────────────────────┘                   │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│    ✓ Creating activity log for undo                        │
│    ✓ Original locations saved                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Progress bar | Determinate | % and file counts |
| Current file | Dynamic text | File being moved + destination |
| Stop button | Danger action | Pauses; offers undo |
| Safety checklist | Status indicators | Confirms backups active |

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Organizing your documents..." |
| Progress | "Moving file [X] of [Y]" |
| Stop | "Stop (undo what's done so far)" |
| Safety 1 | "✓ Creating activity log for undo" |
| Safety 2 | "✓ Original locations saved" |

---

## Screen 8: Success / Completion

### Purpose
Celebrate. Provide next actions. Establish ongoing relationship.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         ✅                                  │
│                                                             │
│              Your documents are organized!                  │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │                                                   │   │
│    │   📁 7 folders created                            │   │
│    │   📄 1,584 documents organized                    │   │
│    │   ⏱️ Time saved: ~4 hours of manual sorting       │   │
│    │                                                   │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│         ┌───────────────────────────────────┐              │
│         │                                   │              │
│         │   📂 Open Organized Folder        │              │
│         │                                   │              │
│         └───────────────────────────────────┘              │
│                                                             │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│    │  ↩️ Undo     │  │  📋 View    │  │  ⚙️ Set up   │       │
│    │  Everything │  │  Activity   │  │  Auto-      │       │
│    │             │  │  Log        │  │  Organize   │       │
│    └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│                                                             │
│    💡 Tip: 176 documents are in your Review folder.         │
│       We'll remind you to sort them later.                  │
│                                                             │
│                                              [ Done ]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Success icon | Static | Checkmark celebration |
| Stats | Info panel | Folders, docs, time saved |
| Open folder | Primary CTA | Opens in Explorer |
| Undo button | Secondary | Confirms, then reverts |
| Log button | Secondary | Opens activity log |
| Auto-organize | Secondary | Goes to settings |
| Review tip | Contextual | Only if Review has items |
| Done button | Tertiary | Closes wizard |

### Microcopy

| Element | Text |
|---------|------|
| Headline | "Your documents are organized!" |
| Stats | "[X] folders created", "[Y] documents organized" |
| Time saved | "Time saved: ~[Z] hours of manual sorting" |
| Tip | "Tip: [X] documents are in your Review folder." |

---

## Screen 9: Dashboard (Ongoing)

### Purpose
Home base for ongoing maintenance.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Logo] Document Organizer                    [⚙️ Settings]  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│    ┌───────────────────────────────────────────────────┐   │
│    │                                                   │   │
│    │  📥 Review folder                      28 items   │   │
│    │                                                   │   │
│    │  New documents since last week need sorting.      │   │
│    │                                                   │   │
│    │                    [ Quick Sort (2 min) → ]       │   │
│    │                                                   │   │
│    └───────────────────────────────────────────────────┘   │
│                                                             │
│    Your organized folders                                   │
│                                                             │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│    │  📁      │  │  📁      │  │  📁      │  │  📁      │ │
│    │  Work    │  │  Money   │  │  Home    │  │  Health  │ │
│    │  412     │  │  298     │  │  187     │  │  156     │ │
│    └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│                                                             │
│    Quick actions                                            │
│                                                             │
│    [ 🔍 Find a document ]  [ 📥 Add new files ]            │
│    [ ↩️ Undo last action ]  [ 📊 View activity log ]        │
│                                                             │
│    ─────────────────────────────────────────────────────   │
│                                                             │
│    ⚙️ Auto-Organize: ON (Conservative)                      │
│       New documents are suggested, not moved.               │
│       [ Change settings ]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Behavior |
|-----------|------|----------|
| Review card | Alert card | Highlighted if items present |
| Quick Sort | Primary CTA | Opens streamlined review |
| Folder grid | Navigation | Click to open in Explorer |
| Quick actions | Button group | Common tasks |
| Auto-organize status | Settings summary | Links to settings |

### Review Card Urgency

| Count | Color | Style |
|-------|-------|-------|
| > 50 | Red | High urgency |
| 20-50 | Yellow | Medium |
| 1-19 | Blue | Low |

### Microcopy

| Element | Text |
|---------|------|
| Review card | "Review folder — [X] items" |
| Quick Sort | "Quick Sort (2 min) →" |
| Auto status (conservative) | "New documents are suggested, not moved." |
| Auto status (automatic) | "New documents are moved with undo available." |
