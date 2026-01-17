# Phase 1: Foundation Alignment
> **Document:** phases/phase1-foundation.md  
> **Priority:** CRITICAL  
> **Estimated Effort:** 1-2 days  
> **Dependencies:** None  
> **Blocks:** Phase 2, Phase 3

---

## Objective

Align the codebase with specification vocabulary and establish infrastructure for activity logging.

---

## Task List

| # | Task | File(s) | Est. Time |
|---|------|---------|-----------|
| 1.1 | Create Category module | `src-tauri/src/category.rs` | 1 hour |
| 1.2 | Create DocumentType module | `src-tauri/src/document_type.rs` | 30 min |
| 1.3 | Update AI prompts | `src-tauri/src/ai.rs` | 1-2 hours |
| 1.4 | Add activity log schema | `src-tauri/src/db.rs` | 1 hour |
| 1.5 | Register new modules | `src-tauri/src/lib.rs` | 15 min |
| 1.6 | Update TypeScript types | `src/types/category.ts` | 30 min |
| 1.7 | Update app state | `src/store/appState.tsx` | 30 min |
| 1.8 | Verify build | Terminal | 15 min |
| 1.9 | Test AI classification | Manual | 30 min |

---

## Task 1.1: Create Category Module

**File:** `src-tauri/src/category.rs`

### Implementation

```rust
//! Category vocabulary and normalization
//!
//! SINGLE SOURCE OF TRUTH for folder categories.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Top-level folder categories per specification doc 03
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "PascalCase")]
pub enum Category {
    Work,
    Money,
    Home,
    Health,
    Legal,
    School,
    Family,
    Clients,
    Projects,
    Archive,
    Review,
}

impl Category {
    /// All valid categories in display order
    pub const ALL: &'static [Category] = &[
        Category::Work,
        Category::Money,
        Category::Home,
        Category::Health,
        Category::Legal,
        Category::School,
        Category::Family,
        Category::Clients,
        Category::Projects,
        Category::Archive,
        Category::Review,
    ];

    /// Returns the category name as a static string
    pub fn as_str(&self) -> &'static str {
        match self {
            Category::Work => "Work",
            Category::Money => "Money",
            Category::Home => "Home",
            Category::Health => "Health",
            Category::Legal => "Legal",
            Category::School => "School",
            Category::Family => "Family",
            Category::Clients => "Clients",
            Category::Projects => "Projects",
            Category::Archive => "Archive",
            Category::Review => "Review",
        }
    }

    /// Parse from string, returning Review for unknown values
    pub fn from_str_or_review(s: &str) -> Self {
        normalize_folder(s)
    }
}

impl fmt::Display for Category {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl Default for Category {
    fn default() -> Self {
        Category::Review
    }
}

/// Normalize any folder name to a canonical Category
///
/// Handles synonyms, misspellings, and AI output variations.
/// Returns Review for unrecognized inputs.
pub fn normalize_folder(raw: &str) -> Category {
    match raw.to_lowercase().trim() {
        // Work synonyms
        "work" | "business" | "office" | "job" | "career" | "professional"
        | "employer" | "employment" => Category::Work,

        // Money synonyms
        "money" | "finance" | "finances" | "financial" | "banking"
        | "accounting" | "bills" | "taxes" | "budget" => Category::Money,

        // Home synonyms
        "home" | "house" | "housing" | "property" | "household"
        | "apartment" | "mortgage" | "utilities" | "rent" => Category::Home,

        // Health synonyms
        "health" | "medical" | "healthcare" | "wellness" | "doctor"
        | "dental" | "vision" | "prescriptions" => Category::Health,

        // Legal synonyms
        "legal" | "contracts" | "agreements" | "law" | "attorney"
        | "lawyer" | "court" | "license" | "licenses" => Category::Legal,

        // School synonyms
        "school" | "education" | "university" | "college" | "academic"
        | "studies" | "student" | "courses" | "training" => Category::School,

        // Family synonyms
        "family" | "kids" | "children" | "spouse" | "relatives"
        | "personal" => Category::Family,

        // Clients synonyms
        "clients" | "customers" | "accounts" | "customer" | "account"
        | "client" => Category::Clients,

        // Projects synonyms
        "projects" | "engagements" | "cases" | "project" => Category::Projects,

        // Archive synonyms
        "archive" | "old" | "historical" | "past" | "archived" => Category::Archive,

        // Review synonyms (explicit)
        "review" | "inbox" | "unsorted" | "unknown" | "other" | "misc"
        | "miscellaneous" => Category::Review,

        // Default fallback
        _ => Category::Review,
    }
}

/// Allowed subfolders for each category
pub fn allowed_subfolders(category: &Category) -> &'static [&'static str] {
    match category {
        Category::Work => &["Clients", "Projects", "Reports", "Correspondence", "HR", "Training"],
        Category::Money => &["Taxes", "Invoices", "Receipts", "Bank", "Insurance", "Budget"],
        Category::Home => &["Utilities", "Maintenance", "Lease", "HOA", "Appliances"],
        Category::Health => &["Records", "Prescriptions", "Insurance", "LabResults", "Appointments"],
        Category::Legal => &["Contracts", "Correspondence", "Court", "Licenses"],
        Category::School => &["Courses", "Research", "Transcripts", "Applications", "Certificates"],
        Category::Family => &[], // Dynamic: family member names
        Category::Clients => &[], // Dynamic: client names
        Category::Projects => &[], // Dynamic: project names
        Category::Archive => &["2024", "2023", "2022", "2021", "2020", "Older"],
        Category::Review => &[], // No subfolders
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_direct_matches() {
        assert_eq!(normalize_folder("Work"), Category::Work);
        assert_eq!(normalize_folder("Money"), Category::Money);
        assert_eq!(normalize_folder("School"), Category::School);
    }

    #[test]
    fn test_synonym_normalization() {
        assert_eq!(normalize_folder("finance"), Category::Money);
        assert_eq!(normalize_folder("MEDICAL"), Category::Health);
        assert_eq!(normalize_folder("education"), Category::School);
        assert_eq!(normalize_folder("business"), Category::Work);
    }

    #[test]
    fn test_case_insensitivity() {
        assert_eq!(normalize_folder("WORK"), Category::Work);
        assert_eq!(normalize_folder("work"), Category::Work);
        assert_eq!(normalize_folder("Work"), Category::Work);
        assert_eq!(normalize_folder("WoRk"), Category::Work);
    }

    #[test]
    fn test_unknown_defaults_to_review() {
        assert_eq!(normalize_folder("xyz123"), Category::Review);
        assert_eq!(normalize_folder(""), Category::Review);
        assert_eq!(normalize_folder("random"), Category::Review);
    }

    #[test]
    fn test_removed_categories_go_to_review() {
        // These were in the old implementation but not in spec
        assert_eq!(normalize_folder("travel"), Category::Review);
        assert_eq!(normalize_folder("identity"), Category::Review);
        assert_eq!(normalize_folder("personal admin"), Category::Review);
    }

    #[test]
    fn test_all_categories_represented() {
        assert_eq!(Category::ALL.len(), 11);
    }

    #[test]
    fn test_display_trait() {
        assert_eq!(format!("{}", Category::Work), "Work");
        assert_eq!(format!("{}", Category::Money), "Money");
    }
}
```

### Acceptance Criteria
- [ ] All 11 categories defined
- [ ] `normalize_folder()` handles all synonyms
- [ ] Tests pass
- [ ] No references to Travel, Identity, Personal Admin

---

## Task 1.2: Create DocumentType Module

**File:** `src-tauri/src/document_type.rs`

### Implementation

```rust
//! Document type classification
//!
//! SINGLE SOURCE OF TRUTH for document types.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Document types per specification doc 04
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "PascalCase")]
pub enum DocumentType {
    Invoice,
    Contract,
    Resume,
    Tax,
    Receipt,
    Letter,
    Report,
    Notes,
    Statement,
    Application,
    Policy,
    Manual,
    Presentation,
    Spreadsheet,
    Unknown,
}

impl DocumentType {
    pub const ALL: &'static [DocumentType] = &[
        DocumentType::Invoice,
        DocumentType::Contract,
        DocumentType::Resume,
        DocumentType::Tax,
        DocumentType::Receipt,
        DocumentType::Letter,
        DocumentType::Report,
        DocumentType::Notes,
        DocumentType::Statement,
        DocumentType::Application,
        DocumentType::Policy,
        DocumentType::Manual,
        DocumentType::Presentation,
        DocumentType::Spreadsheet,
        DocumentType::Unknown,
    ];

    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentType::Invoice => "Invoice",
            DocumentType::Contract => "Contract",
            DocumentType::Resume => "Resume",
            DocumentType::Tax => "Tax",
            DocumentType::Receipt => "Receipt",
            DocumentType::Letter => "Letter",
            DocumentType::Report => "Report",
            DocumentType::Notes => "Notes",
            DocumentType::Statement => "Statement",
            DocumentType::Application => "Application",
            DocumentType::Policy => "Policy",
            DocumentType::Manual => "Manual",
            DocumentType::Presentation => "Presentation",
            DocumentType::Spreadsheet => "Spreadsheet",
            DocumentType::Unknown => "Unknown",
        }
    }

    /// Detect document type from filename extension
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "pptx" | "ppt" | "key" | "odp" => Some(DocumentType::Presentation),
            "xlsx" | "xls" | "csv" | "ods" => Some(DocumentType::Spreadsheet),
            _ => None,
        }
    }
}

impl fmt::Display for DocumentType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl Default for DocumentType {
    fn default() -> Self {
        DocumentType::Unknown
    }
}

/// Detection keywords for each document type
pub fn detection_keywords(doc_type: &DocumentType) -> &'static [&'static str] {
    match doc_type {
        DocumentType::Invoice => &[
            "invoice", "bill", "statement", "amount due", "payment due",
            "total due", "remit to", "factura"
        ],
        DocumentType::Contract => &[
            "agreement", "contract", "terms", "whereas", "hereby",
            "party", "parties", "contrato", "acuerdo"
        ],
        DocumentType::Resume => &[
            "resume", "cv", "curriculum vitae", "experience",
            "employment history", "skills", "education"
        ],
        DocumentType::Tax => &[
            "w-2", "1099", "tax return", "irs", "sat", "rfc",
            "form 1040", "schedule", "declaración"
        ],
        DocumentType::Receipt => &[
            "receipt", "purchase", "transaction", "order confirmation",
            "paid", "recibo", "compra"
        ],
        DocumentType::Letter => &[
            "dear", "sincerely", "to whom it may concern",
            "regards", "atentamente", "estimado"
        ],
        DocumentType::Report => &[
            "report", "analysis", "summary", "findings",
            "quarterly", "annual", "informe", "reporte"
        ],
        DocumentType::Notes => &[
            "notes", "meeting notes", "memo", "minutes",
            "action items", "notas", "minuta"
        ],
        DocumentType::Statement => &[
            "account statement", "balance", "period ending",
            "estado de cuenta"
        ],
        DocumentType::Application => &[
            "application", "apply", "applicant", "submission",
            "solicitud"
        ],
        DocumentType::Policy => &[
            "policy", "coverage", "terms and conditions",
            "effective date", "póliza"
        ],
        DocumentType::Manual => &[
            "manual", "guide", "instructions", "how to",
            "user guide", "guía"
        ],
        DocumentType::Presentation | DocumentType::Spreadsheet => &[], // Extension-based
        DocumentType::Unknown => &[],
    }
}

/// Detect document type from content (case-insensitive search)
pub fn detect_from_content(content: &str) -> (DocumentType, f32) {
    let content_lower = content.to_lowercase();
    let mut best_match = DocumentType::Unknown;
    let mut best_score = 0.0f32;

    for doc_type in DocumentType::ALL.iter() {
        let keywords = detection_keywords(doc_type);
        if keywords.is_empty() {
            continue;
        }

        let matches = keywords
            .iter()
            .filter(|kw| content_lower.contains(*kw))
            .count();

        if matches > 0 {
            let score = matches as f32 / keywords.len() as f32;
            if score > best_score {
                best_score = score;
                best_match = *doc_type;
            }
        }
    }

    // Normalize score to 0.5-0.95 range
    let confidence = if best_score > 0.0 {
        0.5 + (best_score * 0.45)
    } else {
        0.0
    };

    (best_match, confidence)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extension_detection() {
        assert_eq!(
            DocumentType::from_extension("pptx"),
            Some(DocumentType::Presentation)
        );
        assert_eq!(
            DocumentType::from_extension("xlsx"),
            Some(DocumentType::Spreadsheet)
        );
        assert_eq!(DocumentType::from_extension("pdf"), None);
    }

    #[test]
    fn test_content_detection_invoice() {
        let (doc_type, confidence) = detect_from_content("INVOICE #12345\nAmount Due: $500");
        assert_eq!(doc_type, DocumentType::Invoice);
        assert!(confidence > 0.5);
    }

    #[test]
    fn test_content_detection_contract() {
        let (doc_type, _) =
            detect_from_content("This Agreement is entered into by the parties hereby");
        assert_eq!(doc_type, DocumentType::Contract);
    }

    #[test]
    fn test_unknown_content() {
        let (doc_type, confidence) = detect_from_content("random text with no keywords");
        assert_eq!(doc_type, DocumentType::Unknown);
        assert_eq!(confidence, 0.0);
    }
}
```

### Acceptance Criteria
- [ ] All 15 document types defined
- [ ] Extension detection works
- [ ] Content detection returns confidence score
- [ ] Spanish keywords included for es-MX support

---

## Task 1.3: Update AI Prompts

**File:** `src-tauri/src/ai.rs`

### Changes Required

1. **Import new modules** at the top of the file
2. **Remove old Category enum** (now in category.rs)
3. **Update `build_classification_prompt()`** to use approved vocabulary
4. **Update JSON schema** in prompt to match spec

### New Prompt Template

Replace the existing classification prompt with:

```rust
use crate::category::{Category, normalize_folder};
use crate::document_type::DocumentType;

/// Build the AI classification prompt per specification doc 04
pub fn build_classification_prompt(files: &[FileInfo]) -> String {
    let files_json = serde_json::to_string_pretty(files).unwrap_or_default();

    format!(r#"You are a document classification assistant. Analyze each document and suggest the best folder for organization.

## APPROVED FOLDERS (use ONLY these exact names)
Work, Money, Home, Health, Legal, School, Family, Clients, Projects, Archive, Review

## APPROVED DOCUMENT TYPES (use ONLY these exact names)
Invoice, Contract, Resume, Tax, Receipt, Letter, Report, Notes, Statement, Application, Policy, Manual, Presentation, Spreadsheet, Unknown

## FOLDER DEFINITIONS
- Work: Employment, professional documents, business correspondence
- Money: Financial documents, bank statements, invoices, taxes, receipts
- Home: Household management, leases, utilities, maintenance
- Health: Medical records, prescriptions, insurance claims, lab results
- Legal: Contracts, legal correspondence, licenses, court documents
- School: Education, coursework, transcripts, certificates, research
- Family: Family member documents, kids' records, spouse documents
- Clients: Client-specific documents (for freelancers/consultants)
- Projects: Project-specific documents (cross-category grouping)
- Archive: Old documents (3+ years), organized by year
- Review: Low confidence items (< 0.70), unclear classification

## CONFIDENCE GUIDELINES
- 0.90-1.00: Filename + content clearly indicate category
- 0.75-0.89: Strong indicators but some ambiguity
- 0.60-0.74: Moderate indicators, may need review
- 0.50-0.59: Weak indicators, suggest Review folder
- Below 0.50: Route to Review folder

## INPUT FILES
{files_json}

## OUTPUT FORMAT
Return a JSON array with one object per file:
```json
[
  {{
    "id": "file_id",
    "suggested_folder": "Category",
    "suggested_subfolder": "Subfolder or null",
    "document_type": "DocumentType",
    "confidence": 0.85,
    "confidence_reason": "Brief explanation",
    "detected_entities": [
      {{ "type": "company|person|date", "value": "extracted value" }}
    ],
    "detected_year": 2024,
    "flags": ["sensitive", "duplicate_likely"]
  }}
]
```

IMPORTANT:
- Use ONLY approved folder and document type names
- Set confidence below 0.70 to route to Review
- Include confidence_reason for transparency
- Detect entities for Smart Groups mode
- Flag sensitive documents (medical, financial, legal)

Respond with ONLY the JSON array, no additional text."#)
}
```

### Response Parser Update

```rust
/// Parse AI response and normalize to approved vocabulary
pub fn parse_classification_response(response: &str) -> Result<Vec<Classification>, String> {
    let parsed: Vec<RawClassification> = serde_json::from_str(response)
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;

    Ok(parsed
        .into_iter()
        .map(|raw| Classification {
            id: raw.id,
            suggested_folder: normalize_folder(&raw.suggested_folder),
            suggested_subfolder: raw.suggested_subfolder,
            document_type: raw.document_type.unwrap_or_default(),
            confidence: raw.confidence.clamp(0.0, 1.0),
            confidence_reason: raw.confidence_reason,
            detected_entities: raw.detected_entities.unwrap_or_default(),
            detected_year: raw.detected_year,
            flags: raw.flags.unwrap_or_default(),
        })
        .collect())
}

#[derive(Debug, Deserialize)]
struct RawClassification {
    id: String,
    suggested_folder: String,
    suggested_subfolder: Option<String>,
    document_type: Option<DocumentType>,
    confidence: f32,
    confidence_reason: Option<String>,
    detected_entities: Option<Vec<DetectedEntity>>,
    detected_year: Option<i32>,
    flags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Classification {
    pub id: String,
    pub suggested_folder: Category,
    pub suggested_subfolder: Option<String>,
    pub document_type: DocumentType,
    pub confidence: f32,
    pub confidence_reason: Option<String>,
    pub detected_entities: Vec<DetectedEntity>,
    pub detected_year: Option<i32>,
    pub flags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedEntity {
    #[serde(rename = "type")]
    pub entity_type: String,
    pub value: String,
}
```

### Acceptance Criteria
- [ ] Old Category enum removed from ai.rs
- [ ] Imports added for category.rs and document_type.rs
- [ ] Prompt uses approved vocabulary only
- [ ] Response parser normalizes folder names
- [ ] Confidence clamped to 0.0-1.0 range

---

## Task 1.4: Add Activity Log Schema

**File:** `src-tauri/src/db.rs`

### SQL Migration to Add

```rust
/// Activity log schema per specification doc 07
const ACTIVITY_LOG_SCHEMA: &str = r#"
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'partial', 'rolled_back', 'failed')),
    selected_mode TEXT,
    user_type TEXT,
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0
);

-- Operations table
CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    op_id INTEGER NOT NULL,
    op_type TEXT NOT NULL
        CHECK (op_type IN ('move', 'copy', 'create_folder', 'rename', 'delete')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
    source_path TEXT NOT NULL,
    destination_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    extension TEXT,
    size_bytes INTEGER,
    confidence REAL,
    suggested_folder TEXT,
    document_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    rolled_back_at DATETIME,
    UNIQUE(session_id, op_id),
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Errors table
CREATE TABLE IF NOT EXISTS session_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    op_id INTEGER,
    error_code TEXT NOT NULL,
    error_message TEXT,
    file_path TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operations_session ON operations(session_id);
CREATE INDEX IF NOT EXISTS idx_operations_status ON operations(status);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_errors_session ON session_errors(session_id);
"#;

/// Run migrations including activity log tables
pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Existing migrations...
    
    // Add activity log tables
    conn.execute_batch(ACTIVITY_LOG_SCHEMA)?;
    
    Ok(())
}
```

### Acceptance Criteria
- [ ] sessions table created
- [ ] operations table created with foreign key
- [ ] session_errors table created
- [ ] Indexes created for common queries
- [ ] Migration runs without error on fresh DB
- [ ] Migration runs without error on existing DB (idempotent)

---

## Task 1.5: Register New Modules

**File:** `src-tauri/src/lib.rs`

### Changes

```rust
// Add module declarations
pub mod category;
pub mod document_type;
// (activity_log.rs will be added in Phase 3)

// Update any re-exports if needed
pub use category::{Category, normalize_folder};
pub use document_type::DocumentType;
```

### Acceptance Criteria
- [ ] category module registered
- [ ] document_type module registered
- [ ] Public types exported

---

## Task 1.6: Update TypeScript Types

**File:** `src/types/category.ts` (create new)

### Implementation

```typescript
/**
 * Category and DocumentType definitions
 *
 * SINGLE SOURCE OF TRUTH for frontend type definitions.
 * Must match Rust definitions in src-tauri/src/category.rs
 */

export type Category =
  | 'Work'
  | 'Money'
  | 'Home'
  | 'Health'
  | 'Legal'
  | 'School'
  | 'Family'
  | 'Clients'
  | 'Projects'
  | 'Archive'
  | 'Review';

export const CATEGORIES: readonly Category[] = [
  'Work',
  'Money',
  'Home',
  'Health',
  'Legal',
  'School',
  'Family',
  'Clients',
  'Projects',
  'Archive',
  'Review',
] as const;

export type DocumentType =
  | 'Invoice'
  | 'Contract'
  | 'Resume'
  | 'Tax'
  | 'Receipt'
  | 'Letter'
  | 'Report'
  | 'Notes'
  | 'Statement'
  | 'Application'
  | 'Policy'
  | 'Manual'
  | 'Presentation'
  | 'Spreadsheet'
  | 'Unknown';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'Invoice',
  'Contract',
  'Resume',
  'Tax',
  'Receipt',
  'Letter',
  'Report',
  'Notes',
  'Statement',
  'Application',
  'Policy',
  'Manual',
  'Presentation',
  'Spreadsheet',
  'Unknown',
] as const;

export interface Classification {
  id: string;
  suggestedFolder: Category;
  suggestedSubfolder?: string;
  documentType: DocumentType;
  confidence: number;
  confidenceReason?: string;
  detectedEntities: DetectedEntity[];
  detectedYear?: number;
  flags: string[];
}

export interface DetectedEntity {
  type: 'company' | 'person' | 'date' | 'amount' | 'project' | 'client';
  value: string;
  confidence?: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'needs_review';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.70) return 'medium';
  if (confidence >= 0.50) return 'low';
  return 'needs_review';
}

export function shouldRouteToReview(confidence: number, threshold = 0.70): boolean {
  return confidence < threshold;
}

/**
 * Category metadata for UI display
 */
export const CATEGORY_META: Record<Category, { icon: string; color: string }> = {
  Work: { icon: 'briefcase', color: '#3B82F6' },
  Money: { icon: 'dollar-sign', color: '#10B981' },
  Home: { icon: 'home', color: '#F59E0B' },
  Health: { icon: 'heart', color: '#EF4444' },
  Legal: { icon: 'scale', color: '#6366F1' },
  School: { icon: 'graduation-cap', color: '#8B5CF6' },
  Family: { icon: 'users', color: '#EC4899' },
  Clients: { icon: 'user-check', color: '#14B8A6' },
  Projects: { icon: 'folder-kanban', color: '#F97316' },
  Archive: { icon: 'archive', color: '#6B7280' },
  Review: { icon: 'alert-circle', color: '#EAB308' },
};
```

### Acceptance Criteria
- [ ] Category type matches Rust enum
- [ ] DocumentType matches Rust enum
- [ ] Helper functions for confidence levels
- [ ] Category metadata for UI components

---

## Task 1.7: Update App State

**File:** `src/store/appState.tsx`

### Changes Required

1. Import new types from `@/types/category`
2. Remove any old Category type definitions
3. Update state interfaces to use new types
4. Update any hardcoded category lists

### Example Changes

```typescript
// Before
type Category = 'Health' | 'Money' | 'Legal' | 'Home' | 'Work' | 'Education' | 'Family' | 'Travel' | 'Identity' | 'Personal Admin' | 'Review';

// After
import { Category, CATEGORIES, Classification } from '@/types/category';

// Update interfaces
interface AppState {
  // ... existing state
  classifications: Classification[];
  selectedCategory: Category | null;
  // ...
}
```

### Acceptance Criteria
- [ ] Old Category type removed
- [ ] New types imported from @/types/category
- [ ] No TypeScript errors
- [ ] State interfaces use correct types

---

## Task 1.8: Verify Build

### Commands to Run

**Backend (Rust):**
```powershell
cd src-tauri
cargo check
cargo build
cargo test
```

**Frontend (TypeScript):**
```powershell
npm run check  # or tsc --noEmit
npm run build
```

**Full Application:**
```powershell
npm run tauri dev
```

### Acceptance Criteria
- [ ] `cargo check` passes with no errors
- [ ] `cargo build` succeeds
- [ ] `cargo test` all tests pass
- [ ] `npm run build` succeeds
- [ ] Application launches without errors
- [ ] No console errors in dev tools

---

## Task 1.9: Test AI Classification

### Manual Test Cases

1. **Test vocabulary alignment:**
   - Scan a folder with mixed documents
   - Verify all suggested folders are from approved list
   - Verify no Travel, Identity, or Personal Admin suggestions

2. **Test synonym normalization:**
   - Create test files with names like "Finance_Report.pdf"
   - Verify it maps to Money folder, not "Finance"

3. **Test confidence routing:**
   - Verify files with < 0.70 confidence go to Review
   - Verify confidence_reason is populated

4. **Test document type detection:**
   - Include .pptx file → should detect as Presentation
   - Include invoice PDF → should detect as Invoice

### Test Script (Optional)

```typescript
// tests/phase1-validation.ts
import { invoke } from '@tauri-apps/api/tauri';
import { CATEGORIES, Category } from '@/types/category';

async function validateClassification() {
  const testFiles = [
    { name: 'Invoice_2024.pdf', expectedFolder: 'Money' },
    { name: 'Employment_Contract.docx', expectedFolder: 'Work' },
    { name: 'Medical_Records.pdf', expectedFolder: 'Health' },
    { name: 'random_file.txt', expectedFolder: 'Review' }, // Low confidence
  ];

  for (const test of testFiles) {
    const result = await invoke('classify_file', { filename: test.name });
    console.assert(
      CATEGORIES.includes(result.suggestedFolder as Category),
      `Invalid category: ${result.suggestedFolder}`
    );
    console.log(`${test.name} → ${result.suggestedFolder} (expected: ${test.expectedFolder})`);
  }
}
```

### Acceptance Criteria
- [ ] All classifications use approved folders
- [ ] Synonyms normalize correctly
- [ ] Low confidence files route to Review
- [ ] Document types detected correctly

---

## Phase 1 Completion Checklist

```
[ ] 1.1 category.rs created and compiles
[ ] 1.2 document_type.rs created and compiles
[ ] 1.3 ai.rs updated with new prompts
[ ] 1.4 db.rs has activity log schema
[ ] 1.5 lib.rs registers new modules
[ ] 1.6 TypeScript types created
[ ] 1.7 appState.tsx uses new types
[ ] 1.8 Full build succeeds
[ ] 1.9 AI classification tests pass
[ ] No references to Travel, Identity, Personal Admin
[ ] No hardcoded category lists (use Category::ALL or CATEGORIES)
```

---

## Handoff to Phase 2

Once Phase 1 is complete:
1. Commit changes with message: `feat: Phase 1 - Foundation alignment complete`
2. Tag release: `v0.2.0-phase1`
3. Update Phase 1 checklist status
4. Proceed to `phases/phase2-screens.md`
