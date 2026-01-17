# Redesign Implementation Plan

> **Document:** 15-redesign-plan.md
> **Purpose:** Comprehensive implementation plan aligning current codebase with specifications
> **Created:** 2026-01-14

---

## Executive Summary

This plan transforms AI FileSense from its current prototype state into the world-class product defined in documents 00-14. The redesign is organized into **5 phases** spanning the core functionality, with clear milestones and dependencies.

### Current State Assessment

| Component | Status | Gap Analysis |
|-----------|--------|--------------|
| Scanning | Partial | Works but needs refinement |
| AI Classification | **Misaligned** | Uses "Life Domains" - needs to align with spec vocabulary |
| Organization Modes | Partial | Three modes defined but not fully implemented |
| Activity Log | Not Started | Critical for undo - spec in doc 07 |
| Auto-Organize Service | Not Started | Background service - spec in doc 08 |
| Error Handling | Basic | Needs full taxonomy from doc 09 |
| Installer/Onboarding | Not Started | First-run experience - spec in doc 10 |
| Settings | Basic | Full spec in doc 11 |
| Analytics | Not Started | Privacy-respecting telemetry - spec in doc 12 |
| Localization | Partial | en-US/es-MX structure exists, needs expansion |
| Testing | Not Started | Full strategy in doc 14 |
| UI Screens | Partial | 9 screens specified in doc 06, ~3 implemented |

### Critical Alignment Issue

**The Category/Folder vocabulary must be reconciled:**

| Current Implementation | Specification (doc 03) |
|----------------------|------------------------|
| Health | Health |
| Money | Money |
| Legal | Legal |
| Home | Home |
| Work | Work |
| Education | **School** |
| Family | Family |
| Travel | *(not in spec)* |
| Identity | *(not in spec)* |
| Personal Admin | *(not in spec)* |
| Review | Review |
| — | **Clients** |
| — | **Projects** |
| — | **Archive** |

**Decision Required:** Adopt the specification vocabulary (Work, Money, Home, Health, Legal, School, Family, Clients, Projects, Archive, Review) to maintain consistency with all documentation.

---

## Phase 1: Foundation Alignment (Priority: Critical)

**Goal:** Align codebase with specifications, establish core infrastructure

### 1.1 Category Vocabulary Alignment

**Files to Modify:**
- `src-tauri/src/ai.rs` - Update Category enum
- `src-tauri/src/commands.rs` - Update any category references
- `src/store/appState.tsx` - Update TypeScript types

**New Category Enum (per doc 03):**
```rust
pub enum Category {
    Work,      // Employment, clients, projects, professional docs
    Money,     // Banking, budgets, taxes, investments, receipts
    Home,      // Mortgage/rent, utilities, repairs, warranties
    Health,    // Medical, dental, vision, prescriptions, labs
    Legal,     // Contracts, court docs, agreements, licenses
    School,    // Courses, certificates, transcripts, assignments
    Family,    // Kids' school docs, spouse documents, family records
    Clients,   // Client-specific documents (freelancers/SMB)
    Projects,  // Project-specific documents
    Archive,   // Old documents by year
    Review,    // Low confidence items needing user attention
}
```

**Synonym Map (per doc 03):**
```rust
// Map AI outputs to canonical folders
fn normalize_folder(raw: &str) -> &str {
    match raw.to_lowercase().as_str() {
        "finance" | "financial" | "banking" | "taxes" => "Money",
        "medical" | "healthcare" | "dental" | "vision" => "Health",
        "education" | "academic" | "university" | "college" => "School",
        "contract" | "agreement" | "court" => "Legal",
        "household" | "property" | "utilities" | "mortgage" => "Home",
        "employment" | "job" | "career" | "business" => "Work",
        "kids" | "children" | "spouse" | "relatives" => "Family",
        _ => raw
    }
}
```

### 1.2 AI Prompt Update

**File:** `src-tauri/src/ai.rs`

Update `build_classification_prompt` to use:
- Approved folder vocabulary only
- Approved document types only
- Confidence guidelines from doc 04

**Approved Folders:** Work, Money, Home, Health, Legal, School, Family, Clients, Projects, Archive, Review

**Approved Document Types:** Invoice, Contract, Resume, Tax, Receipt, Letter, Report, Notes, Statement, Application, Policy, Manual, Presentation, Spreadsheet, Unknown

### 1.3 Database Schema Update

**File:** `src-tauri/src/db.rs`

Add tables for Activity Log (doc 07):
```sql
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    status TEXT CHECK (status IN ('in_progress', 'completed', 'partial', 'rolled_back', 'failed')),
    selected_mode TEXT,
    user_type TEXT,
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0
);

CREATE TABLE operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    op_id INTEGER NOT NULL,
    type TEXT CHECK (type IN ('move', 'copy', 'create_folder', 'rename', 'delete')),
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
    source_path TEXT,
    destination_path TEXT,
    filename TEXT,
    extension TEXT,
    size_bytes INTEGER,
    confidence REAL,
    suggested_folder TEXT,
    document_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    rolled_back_at DATETIME,
    UNIQUE(session_id, op_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

CREATE TABLE errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    op_id INTEGER,
    error_code TEXT NOT NULL,
    error_message TEXT,
    file_path TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);
```

### 1.4 Milestone Checklist

- [ ] Category enum updated to spec vocabulary
- [ ] Synonym normalization implemented
- [ ] AI prompt updated with approved vocabulary
- [ ] Database schema includes activity log tables
- [ ] TypeScript types aligned with Rust enums
- [ ] All existing tests pass
- [ ] App builds without errors

---

## Phase 2: Core User Journey (Priority: Critical)

**Goal:** Implement the 9-screen user journey from doc 06

### 2.1 Screen Implementation Map

| Screen | Current State | Action |
|--------|--------------|--------|
| 1. Welcome/File Type Selection | Exists (FolderSelectionScreen) | Refactor to match spec |
| 2. Location Selection | Merged with Screen 1 | Split out |
| 3. Scan Progress + Personalization | Exists (ScanningScreen) | Add Q1/Q2/Q3 questions |
| 4. Results Preview | Exists (basic) | Enhance with bar chart |
| 5. Detailed Review | Exists (basic) | Add folder tree, file list |
| 6. Quick Fixes | Not Started | New screen |
| 7. Applying Changes | Exists (basic) | Add stop button, safety indicators |
| 8. Success | Exists (basic) | Add stats, next actions |
| 9. Dashboard | Not Started | New screen |

### 2.2 Screen 1: Welcome / File Type Selection

**File:** `src/screens/WelcomeScreen.tsx` (new)

```
Components:
- App logo
- Headline: "Let's get your documents organized"
- File type toggle buttons (PDF, Word, Text, All Documents)
- Trust statement with lock icon
- Advanced options link (expandable)
- Continue button
```

**i18n Keys:**
```json
{
  "welcome": {
    "title": "Let's get your documents organized",
    "subtitle": "Pick what you want to organize—you can always do more later.",
    "trustLine": "Your files stay on your computer. Nothing moves until you approve.",
    "allDocuments": "All Documents",
    "advanced": "Advanced options",
    "continue": "Continue"
  }
}
```

### 2.3 Screen 2: Location Selection

**File:** `src/screens/LocationSelectionScreen.tsx` (refactor from FolderSelectionScreen)

```
Components:
- Back button
- Headline: "Where are your documents?"
- Location checkboxes with file counts
- Add folder option
- Include subfolders toggle
- Total estimate
- Scan Now button
```

### 2.4 Screen 3: Scan Progress + Personalization

**File:** `src/screens/ScanProgressScreen.tsx` (enhance existing)

```
Components:
- Progress bar with percentage
- File count: "Analyzed X of Y documents"
- OPTIONAL personalization questions:
  - Q1: User type (8 options per doc 05)
  - Q2: Lookup style (topic/time/project/unknown)
  - Q3: Automation level (safe/balanced/aggressive)
- Skip link
```

### 2.5 Screen 4: Results Preview

**File:** `src/screens/ResultsPreviewScreen.tsx` (enhance existing)

```
Components:
- Summary card with total count
- Horizontal bar chart by folder
- Mode selector (Simple/Timeline/Smart Groups)
- AI explanation text
- Review notice (X documents need review)
- Review Changes button
```

### 2.6 Screen 5: Detailed Review

**File:** `src/screens/DetailedReviewScreen.tsx` (new)

```
Components:
- Two-panel layout:
  - Left: Folder tree with counts
  - Right: File list with destination, confidence, reason
- Confidence indicators (High/Medium/Low/Needs Review)
- Keep/Change folder dropdown per file
- Confirmation checkbox
- Fix flagged items button
- Apply Organization button
```

### 2.7 Screen 6: Quick Fixes

**File:** `src/screens/QuickFixesScreen.tsx` (new)

```
Components:
- Step counter (1 of 3)
- Entity card with sample files
- Choice buttons (Work/Client/Vendor/Skip)
- Skip all link
- Max 5 questions
```

### 2.8 Screen 7: Applying Changes

**File:** `src/screens/ApplyingChangesScreen.tsx` (enhance existing)

```
Components:
- Progress bar with percentage
- Current file being moved
- Stop button with undo option
- Safety checklist:
  - "Creating activity log for undo"
  - "Original locations saved"
```

### 2.9 Screen 8: Success

**File:** `src/screens/SuccessScreen.tsx` (enhance existing)

```
Components:
- Success icon
- Stats: folders created, docs organized, time saved
- Open Organized Folder button (primary)
- Action buttons: Undo, View Activity Log, Set up Auto-Organize
- Review folder tip (if items in Review)
- Done button
```

### 2.10 Screen 9: Dashboard

**File:** `src/screens/DashboardScreen.tsx` (new)

```
Components:
- Review folder card with urgency indicator
- Quick Sort button
- Folder grid with counts
- Quick actions: Find, Add files, Undo, View log
- Auto-organize status indicator
```

### 2.11 Milestone Checklist

- [ ] All 9 screens implemented
- [ ] Navigation flow matches doc 02 user journey
- [ ] Q1/Q2/Q3 personalization questions working
- [ ] Mode selection affects organization plan
- [ ] Confidence threshold affects Review routing
- [ ] i18n strings for all screens (en-US, es-MX)
- [ ] All screen sizes tested (1366x768 to 2560x1440)

---

## Phase 3: Activity Log & Undo System (Priority: Critical)

**Goal:** Implement complete activity logging and undo capability per doc 07

### 3.1 Backend Implementation

**File:** `src-tauri/src/activity_log.rs` (new)

```rust
// Core functions needed:
pub fn create_session() -> String;  // Returns session_id
pub fn log_operation(session_id: &str, op: Operation) -> Result<(), Error>;
pub fn complete_session(session_id: &str, status: SessionStatus);
pub fn undo_operation(session_id: &str, op_id: i32) -> Result<UndoResult, Error>;
pub fn undo_session(session_id: &str) -> Result<SessionUndoResult, Error>;
pub fn get_session_log(session_id: &str) -> Result<SessionLog, Error>;
pub fn export_human_readable(session_id: &str) -> String;
pub fn cleanup_old_logs(retention_days: i32);
```

### 3.2 Tauri Commands

**File:** `src-tauri/src/commands.rs`

```rust
#[tauri::command]
pub fn start_organization_session(app: AppHandle) -> Result<String, String>;

#[tauri::command]
pub fn log_file_move(
    app: AppHandle,
    session_id: String,
    source: String,
    destination: String,
    classification: FileClassification
) -> Result<i32, String>;

#[tauri::command]
pub fn undo_last_operation(app: AppHandle, session_id: String) -> Result<UndoResult, String>;

#[tauri::command]
pub fn undo_entire_session(app: AppHandle, session_id: String) -> Result<SessionUndoResult, String>;

#[tauri::command]
pub fn get_activity_log(app: AppHandle, session_id: String) -> Result<SessionLog, String>;

#[tauri::command]
pub fn get_recent_sessions(app: AppHandle, limit: i32) -> Result<Vec<SessionSummary>, String>;
```

### 3.3 Frontend Integration

**File:** `src/services/activityLog.ts` (new)

```typescript
export async function startSession(): Promise<string>;
export async function logOperation(sessionId: string, operation: Operation): Promise<number>;
export async function undoOperation(sessionId: string, opId: number): Promise<UndoResult>;
export async function undoSession(sessionId: string): Promise<SessionUndoResult>;
export async function getSessionLog(sessionId: string): Promise<SessionLog>;
export async function getRecentSessions(limit?: number): Promise<SessionSummary[]>;
```

### 3.4 Activity Log UI

**File:** `src/components/ActivityLog.tsx` (new)

```
Components:
- Session list with dates and status
- Session detail view:
  - Summary stats
  - Operation list
  - Error list
- Undo buttons (per-file and full session)
- Export button
```

### 3.5 Crash Recovery

**File:** `src-tauri/src/recovery.rs` (new)

```rust
pub fn check_incomplete_sessions() -> Option<IncompleteSession>;
pub fn resume_session(session_id: &str) -> Result<(), Error>;
pub fn rollback_incomplete(session_id: &str) -> Result<SessionUndoResult, Error>;
```

### 3.6 Milestone Checklist

- [ ] Session creation and tracking working
- [ ] All file operations logged
- [ ] Single file undo working
- [ ] Full session undo working
- [ ] Activity log UI implemented
- [ ] Human-readable export working
- [ ] Crash recovery dialog implemented
- [ ] 90-day log retention with cleanup

---

## Phase 4: Error Handling & Polish (Priority: High)

**Goal:** Implement comprehensive error handling per doc 09

### 4.1 Error Taxonomy Implementation

**File:** `src-tauri/src/errors.rs` (new)

```rust
pub enum ErrorCode {
    FileNotFound,
    FileLocked,
    FileInUse,
    AccessDenied,
    PathTooLong,
    DiskFull,
    NetworkError,
    CorruptedFile,
    DuplicateExists,
    FolderCreateFailed,
    ClassificationFailed,
    ServiceUnavailable,
}

pub enum ErrorSeverity {
    Low,      // Auto-skip
    Medium,   // Retry or skip choice
    High,     // May need intervention
    Critical, // Stop operation
}

pub struct ErrorContext {
    pub code: ErrorCode,
    pub message: String,
    pub file_path: Option<String>,
    pub severity: ErrorSeverity,
    pub suggested_actions: Vec<RecoveryAction>,
    pub technical_details: Option<String>,
}
```

### 4.2 Error Dialogs

**Files:** `src/components/ErrorDialogs/`
- `FileLocked.tsx`
- `AccessDenied.tsx`
- `DiskFull.tsx`
- `DuplicateExists.tsx`
- `BatchSummary.tsx`

Each dialog per spec in doc 09 with:
- Clear title and message
- Recovery action buttons
- "Apply to all" checkbox where applicable

### 4.3 Recovery Strategies

**File:** `src-tauri/src/recovery_strategies.rs`

```rust
pub fn handle_file_locked(path: &str) -> RecoveryAction;
pub fn handle_disk_full(context: &ErrorContext) -> DiskFullOptions;
pub fn handle_path_too_long(path: &str, dest: &str) -> Option<String>;
pub fn handle_duplicate(source: &str, dest: &str, strategy: DuplicateStrategy) -> Option<String>;
```

### 4.4 Milestone Checklist

- [ ] All error codes from taxonomy implemented
- [ ] Error dialogs for each severity level
- [ ] "Apply to all" preference memory
- [ ] Recovery strategies working
- [ ] Errors logged to activity log
- [ ] Batch error summary screen
- [ ] i18n for all error messages (en-US, es-MX)

---

## Phase 5: Advanced Features (Priority: Medium)

**Goal:** Implement auto-organize, settings, analytics per docs 08, 11, 12

### 5.1 Auto-Organize Service

**Per doc 08 - implement after core flow is stable**

**Components:**
- File watcher service (Windows)
- Three modes: Conservative, Automatic, Scheduled
- System tray icon
- Windows toast notifications
- Configuration UI in Settings

**Files:**
- `src-tauri/src/auto_organize.rs`
- `src-tauri/src/file_watcher.rs`
- `src-tauri/src/tray_icon.rs`
- `src/screens/SettingsAutoOrganize.tsx`

### 5.2 Settings Screens

**Per doc 11 - full settings implementation**

**Files:**
- `src/screens/Settings/GeneralSettings.tsx`
- `src/screens/Settings/ScanningSettings.tsx`
- `src/screens/Settings/OrganizationSettings.tsx`
- `src/screens/Settings/AutoOrganizeSettings.tsx`
- `src/screens/Settings/NotificationSettings.tsx`
- `src/screens/Settings/PrivacySettings.tsx`
- `src/screens/Settings/AdvancedSettings.tsx`

### 5.3 Analytics

**Per doc 12 - privacy-respecting telemetry**

**Implementation:**
- Opt-in during onboarding
- Event queue with offline support
- Sanitization to remove any PII/paths
- Never collect file names or contents

**Files:**
- `src/services/analytics.ts`
- `src-tauri/src/analytics.rs`

### 5.4 Installer & Onboarding

**Per doc 10 - first-run experience**

**Components:**
- Onboarding screens (O-1 through O-6)
- Permission request flow
- Optional guided tour
- "What's new" on updates

### 5.5 Milestone Checklist

- [ ] Auto-organize service functional
- [ ] All settings screens implemented
- [ ] Settings persistence working
- [ ] Analytics with consent
- [ ] Onboarding flow complete
- [ ] Installer configured
- [ ] Windows service registration

---

## Implementation Order

### Immediate (This Session)

1. **Fix Category Alignment** - Update `ai.rs` enum and prompt to use spec vocabulary
2. **Update Frontend Types** - Align TypeScript with Rust changes
3. **Verify Build** - Ensure app compiles and runs

### Short Term (Next Sessions)

4. **Activity Log Schema** - Add database tables
5. **Screen Refactoring** - Split/create screens per spec
6. **Navigation Flow** - Implement full user journey

### Medium Term

7. **Activity Log Backend** - Full undo capability
8. **Error Handling** - Complete taxonomy
9. **Settings Screens** - Full implementation

### Long Term

10. **Auto-Organize Service** - Background monitoring
11. **Analytics** - Telemetry with consent
12. **Installer** - MSI/MSIX packaging
13. **Testing** - Per doc 14 strategy

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Folder Vocabulary | Adopt spec (doc 03) | Consistency with all documentation |
| Life Domains → Spec | Replace Travel, Identity, Personal Admin with Clients, Projects, Archive | Match spec, support freelancer/SMB use case |
| Review Threshold | 0.7 (balanced) | Per doc 05, configurable in settings |
| Max Folders | 10 | Per doc 01 guardrails |
| Max Depth | 2 | Per doc 01 guardrails |
| i18n Framework | Keep existing (react-i18next) | Already implemented, matches doc 13 |

---

## File Change Summary

### Files to Create

```
src-tauri/src/activity_log.rs
src-tauri/src/errors.rs
src-tauri/src/recovery.rs
src-tauri/src/recovery_strategies.rs
src-tauri/src/auto_organize.rs (Phase 5)
src-tauri/src/file_watcher.rs (Phase 5)

src/screens/WelcomeScreen.tsx
src/screens/LocationSelectionScreen.tsx
src/screens/DetailedReviewScreen.tsx
src/screens/QuickFixesScreen.tsx
src/screens/DashboardScreen.tsx
src/screens/Settings/*.tsx

src/services/activityLog.ts
src/services/analytics.ts (Phase 5)

src/components/ActivityLog.tsx
src/components/ErrorDialogs/*.tsx
```

### Files to Modify

```
src-tauri/src/ai.rs - Category enum, AI prompt
src-tauri/src/db.rs - Add activity log tables
src-tauri/src/commands.rs - Add new commands
src-tauri/src/lib.rs - Register new commands

src/store/appState.tsx - Update types
src/screens/ScanProgressScreen.tsx - Add personalization
src/screens/ResultsPreviewScreen.tsx - Enhance
src/screens/ApplyingChangesScreen.tsx - Add safety UI
src/screens/SuccessScreen.tsx - Add stats

src/i18n/en.json - Add all new strings
src/i18n/es-MX.json - Add all new strings
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] `cargo build` succeeds with new Category enum
- [ ] `npm run dev` shows app without errors
- [ ] AI classification returns spec vocabulary

### Phase 2 Complete When:
- [ ] User can navigate all 9 screens
- [ ] Personalization questions affect mode recommendation
- [ ] Organization completes with visual feedback

### Phase 3 Complete When:
- [ ] Every file operation is logged
- [ ] Undo single file works
- [ ] Undo full session works
- [ ] Activity log persists across restarts

### Phase 4 Complete When:
- [ ] Locked file shows appropriate dialog
- [ ] Disk full stops gracefully
- [ ] Duplicates handled with user choice

### Phase 5 Complete When:
- [ ] Auto-organize monitors Downloads
- [ ] All settings persist and apply
- [ ] Analytics tracks usage (with consent)

---

## Appendix: Quick Reference

### Approved Folder Names (doc 03)
```
Work, Money, Home, Health, Legal, School, Family, Clients, Projects, Archive, Review
```

### Approved Document Types (doc 04)
```
Invoice, Contract, Resume, Tax, Receipt, Letter, Report, Notes, Statement, Application, Policy, Manual, Presentation, Spreadsheet, Unknown
```

### Screen Sizes to Test (doc 14)
```
1366x768 (laptop-small)
1536x864 (laptop-medium)
1920x1080 (laptop-large)
2560x1440 (desktop-qhd)
2560x1080 (ultrawide)
```

### Error Severity Actions (doc 09)
```
Low: Auto-skip, log only
Medium: Retry then ask user
High: Stop and ask user
Critical: Stop operation entirely
```
