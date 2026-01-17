# Taxonomy and Controlled Vocabulary

> **Document:** 03-taxonomy-and-vocabulary.md  
> **Purpose:** Define folder names, synonyms, and document classification types

---

## Design Philosophy

### Why Controlled Vocabulary Matters

Without constraints, AI might generate:
- "Finance" in one session, "Money" in another, "Accounting" in a third
- 37 hyper-specific folders that confuse users
- Inconsistent depth (some areas 5 levels deep, others flat)

**Solution:** AI must use ONLY names from the approved vocabulary, with automatic synonym normalization.

---

## The 2-Layer Model

Deep hierarchies are where users get lost. This system uses maximum 2 levels.

```
Layer 1: Collections (top-level buckets)
├── Work
│   └── Layer 2: Subfolders (optional)
│       ├── Projects
│       ├── Reports
│       └── Clients
├── Money
│   └── Subfolders
│       ├── Taxes
│       ├── Invoices
│       └── Receipts
├── Home
├── Health
├── Archive
│   └── Subfolders (by year)
│       ├── 2024
│       ├── 2023
│       └── Older
└── Review
```

**Key constraint:** Users can succeed using ONLY Collections + Year. Subfolders are optional enhancement.

---

## Top-Level Folders (Collections)

Maximum 10 active per plan. AI selects from this list based on scan results.

| Canonical Name | When to Use | Typical Contents |
|----------------|-------------|------------------|
| `Work` | Employment-related documents | Reports, projects, HR docs |
| `Money` | Financial documents | Bills, taxes, invoices, statements |
| `Home` | Household management | Leases, utilities, maintenance |
| `Health` | Medical and wellness | Records, prescriptions, insurance |
| `Legal` | Contracts and legal matters | Agreements, correspondence |
| `School` | Education-related | Coursework, transcripts, research |
| `Family` | Family member documents | Kids' records, family admin |
| `Clients` | Client-specific (freelancers/SMBs) | Per-client folders |
| `Projects` | Project-based grouping | Per-project folders |
| `Archive` | Old documents (3+ years) | Organized by year |
| `Review` | Low-confidence items | User decision required |

---

## Synonym Map

When AI or user mentions these terms, normalize to canonical name.

```python
SYNONYM_MAP = {
    # Work synonyms
    "business": "Work",
    "office": "Work",
    "job": "Work",
    "career": "Work",
    "professional": "Work",
    "employer": "Work",
    
    # Money synonyms
    "finance": "Money",
    "finances": "Money",
    "financial": "Money",
    "banking": "Money",
    "accounting": "Money",
    "bills": "Money",
    
    # Home synonyms
    "house": "Home",
    "housing": "Home",
    "property": "Home",
    "household": "Home",
    "apartment": "Home",
    
    # Health synonyms
    "medical": "Health",
    "healthcare": "Health",
    "wellness": "Health",
    "doctor": "Health",
    
    # Legal synonyms
    "contracts": "Legal",
    "agreements": "Legal",
    "law": "Legal",
    "attorney": "Legal",
    
    # School synonyms
    "education": "School",
    "university": "School",
    "college": "School",
    "academic": "School",
    "studies": "School",
    "student": "School",
    
    # Family synonyms
    "kids": "Family",
    "children": "Family",
    "personal": "Family",
    
    # Client synonyms
    "customers": "Clients",
    "accounts": "Clients",
    
    # Archive synonyms
    "old": "Archive",
    "historical": "Archive",
    "past": "Archive",
    
    # Review synonyms
    "inbox": "Review",
    "unsorted": "Review",
    "unknown": "Review",
    "other": "Review"
}
```

### Normalization Function

```python
def normalize_folder_name(name: str) -> str:
    """Always returns a canonical folder name."""
    key = name.lower().strip()
    return SYNONYM_MAP.get(key, name.title())

# Examples:
# normalize_folder_name("finance") → "Money"
# normalize_folder_name("MEDICAL") → "Health"
# normalize_folder_name("Unknown Category") → "Unknown Category" (not in map)
```

---

## Allowed Subfolders (Layer 2)

Each top-level folder has a defined set of allowed subfolders.

| Parent | Allowed Subfolders |
|--------|-------------------|
| `Work` | Clients, Projects, Reports, Correspondence, HR, Training |
| `Money` | Taxes, Invoices, Receipts, Bank, Insurance, Budget |
| `Home` | Utilities, Maintenance, Lease, HOA, Appliances |
| `Health` | Records, Prescriptions, Insurance, Lab Results, Appointments |
| `Legal` | Contracts, Correspondence, Court, Licenses |
| `School` | Courses, Research, Transcripts, Applications, Certificates |
| `Family` | [Dynamic: family member names if detected] |
| `Clients` | [Dynamic: client names from scan] |
| `Projects` | [Dynamic: project names from scan] |
| `Archive` | 2024, 2023, 2022, 2021, 2020, Older |
| `Review` | [No subfolders—flat inbox] |

---

## Document Type Tags

Used for classification and Smart Groups mode.

| Tag | Detection Keywords | Common Extensions |
|-----|-------------------|-------------------|
| `Invoice` | invoice, bill, statement, amount due, payment due, factura | PDF |
| `Contract` | agreement, contract, terms, whereas, hereby, parties | PDF, DOCX |
| `Resume` | resume, cv, curriculum vitae, experience, employment history | PDF, DOCX |
| `Tax` | w-2, 1099, tax return, irs, sat, rfc, declaración | PDF |
| `Receipt` | receipt, purchase, transaction, order confirmation, recibo | PDF |
| `Letter` | dear, sincerely, to whom it may concern, attn | DOCX, PDF |
| `Report` | report, analysis, summary, findings, quarterly, annual | PDF, DOCX |
| `Notes` | notes, meeting notes, memo, minutes, agenda | TXT, DOCX |
| `Statement` | statement, account summary, balance, period ending | PDF |
| `Application` | application, apply, submission, form | PDF, DOCX |
| `Policy` | policy, coverage, terms and conditions, insurance | PDF |
| `Manual` | manual, guide, instructions, how to, handbook | PDF |
| `Presentation` | presentation, slides, deck | PPTX (if supported) |
| `Spreadsheet` | spreadsheet, data, calculations | XLSX (if supported) |
| `Unknown` | [Default when no pattern matches] | Any |

---

## Entity Extraction

Entities are extracted for Smart Groups mode and personalization.

### Entity Types

| Type | Detection Method | Example |
|------|------------------|---------|
| `client` | "Bill To:", "Client:", recurring company in invoices | "Acme Corp" |
| `company` | Letterheads, "From:", document headers | "Microsoft" |
| `person` | "Prepared for:", addressee, recipient | "John Smith" |
| `project` | "Project:", "RE:", folder patterns | "Website Redesign" |

### Extraction Rules

```python
ENTITY_PATTERNS = {
    'client': [
        r'Bill\s*To[:\s]+([A-Z][A-Za-z\s&]+)',
        r'Client[:\s]+([A-Z][A-Za-z\s&]+)',
        r'Customer[:\s]+([A-Z][A-Za-z\s&]+)',
    ],
    'company': [
        r'^([A-Z][A-Za-z\s&]+(?:Inc|LLC|Corp|Ltd)\.?)',
        r'From[:\s]+([A-Z][A-Za-z\s&]+)',
    ],
    'project': [
        r'Project[:\s]+([A-Za-z0-9\s\-]+)',
        r'RE[:\s]+([A-Za-z0-9\s\-]+)',
    ]
}
```

---

## Mode-Specific Folder Sets

### Simple Mode (Default)

```
Organized/
├── Work
├── Money
├── Home
├── Health
├── Archive/
│   ├── 2024
│   ├── 2023
│   └── Older
└── Review
```

### Timeline Mode

```
Organized/
├── 2025
├── 2024
├── 2023
├── 2022
├── Older
└── Review
```

### Smart Groups Mode

```
Organized/
├── Clients/
│   ├── Acme Corp
│   ├── Beta Inc
│   └── Gamma LLC
├── Projects/
│   ├── Website Redesign
│   └── Q1 Campaign
├── Money
├── Archive
└── Review
```

---

## Folder Selection Logic

```python
def select_folders(mode: str, user_type: str, scan: ScanSummary) -> list[str]:
    """
    Returns ordered list of canonical folder names to create.
    Always includes 'Review' as last folder.
    """
    
    BASE_FOLDERS = {
        "simple": ["Work", "Money", "Home", "Health", "Archive", "Review"],
        "timeline": ["2025", "2024", "2023", "Older", "Review"],
        "smart_groups": ["Clients", "Projects", "Money", "Archive", "Review"]
    }
    
    folders = BASE_FOLDERS[mode].copy()
    
    # Personalization based on user type
    if user_type == "student" and "School" not in folders:
        folders.insert(2, "School")
    if user_type == "parent" and "Family" not in folders:
        folders.insert(3, "Family")
    if user_type in ("freelancer", "smb_owner") and "Clients" not in folders:
        folders.insert(1, "Clients")
    if user_type == "teacher" and "School" not in folders:
        folders.insert(1, "School")
    
    # Remove empty folders based on scan
    folders = [f for f in folders if f == "Review" or scan.has_documents_for(f)]
    
    # Cap at 10 folders (keep Review)
    if len(folders) > 10:
        folders = folders[:9] + ["Review"]
    
    return folders
```

---

## Validation Rules

### Folder Name Validation

```python
def validate_folder_name(name: str) -> bool:
    """Check if folder name is allowed."""
    canonical = normalize_folder_name(name)
    return canonical in ALLOWED_TOP_LEVEL_FOLDERS

ALLOWED_TOP_LEVEL_FOLDERS = {
    "Work", "Money", "Home", "Health", "Legal", 
    "School", "Family", "Clients", "Projects", 
    "Archive", "Review",
    # Timeline mode years
    "2025", "2024", "2023", "2022", "2021", "2020", "Older"
}
```

### Subfolder Validation

```python
def validate_subfolder(parent: str, subfolder: str) -> bool:
    """Check if subfolder is allowed under parent."""
    allowed = ALLOWED_SUBFOLDERS.get(parent, set())
    
    # Dynamic subfolders for Clients/Projects
    if parent in ("Clients", "Projects"):
        return True  # Allow any detected entity name
    
    # Year subfolders for Archive
    if parent == "Archive":
        return subfolder.isdigit() or subfolder == "Older"
    
    return subfolder in allowed
```

---

## Anti-Collision Rules

Prevent confusing overlaps:

| If this exists... | Don't also create... |
|-------------------|---------------------|
| `Money` | `Finance`, `Financial`, `Accounting` |
| `Work` | `Business`, `Office`, `Job` |
| `Health` | `Medical`, `Healthcare` |
| `Clients` (Smart Groups) | `Work` (would be redundant) |

---

## Summary

| Constraint | Value |
|------------|-------|
| Maximum top-level folders | 10 |
| Maximum depth | 2 levels |
| Folder naming | From approved vocabulary only |
| Synonym handling | Automatic normalization |
| Dynamic folders | Clients, Projects, Years only |
| Review folder | Always present, always last |
