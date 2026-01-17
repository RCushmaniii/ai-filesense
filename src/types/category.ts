/**
 * Category and DocumentType definitions
 *
 * SINGLE SOURCE OF TRUTH for frontend type definitions.
 * Must match Rust definitions in src-tauri/src/category.rs
 *
 * 11-folder numbered system for consistent sort order:
 * 01 Work, 02 Money, 03 Home, ... 11 Review
 *
 * Approved folder names (English / Spanish MX):
 * 1. Work / Trabajo
 * 2. Money / Dinero
 * 3. Home / Casa
 * 4. Health / Salud
 * 5. Legal / Legal
 * 6. School / Escuela
 * 7. Family & Friends / Familia y Amigos
 * 8. Clients / Clientes
 * 9. Projects / Proyectos
 * 10. Archive / Archivo
 * 11. Review / Revisar
 */

// ============================================
// Category Types - 11 Numbered Smart Folders
// ============================================

export type Category =
  | 'Work'       // 01 - Employment, resumes, performance reviews, career docs
  | 'Money'      // 02 - Banking, taxes, investments, receipts, budgets
  | 'Home'       // 03 - Mortgage/rent, utilities, repairs, warranties, property
  | 'Health'     // 04 - Medical records, insurance, prescriptions, dental, vision
  | 'Legal'      // 05 - Contracts, agreements, legal correspondence, licenses, IDs
  | 'School'     // 06 - Education, courses, certifications, transcripts, research
  | 'Family'     // 07 - Family & friends documents, kids' records, personal relationships
  | 'Clients'    // 08 - Client-specific documents (freelancers/SMB)
  | 'Projects'   // 09 - Active projects (AI creates subfolders by project name)
  | 'Archive'    // 10 - Old/inactive items, historical records by year
  | 'Review';    // 11 - Low confidence items needing user attention

// Categories in numbered order
export const CATEGORIES: readonly Category[] = [
  'Work',       // 01
  'Money',      // 02
  'Home',       // 03
  'Health',     // 04
  'Legal',      // 05
  'School',     // 06
  'Family',     // 07
  'Clients',    // 08
  'Projects',   // 09
  'Archive',    // 10
  'Review',     // 11
] as const;

// Category number mapping for folder names
export const CATEGORY_NUMBERS: Record<Category, string> = {
  Work: '01',
  Money: '02',
  Home: '03',
  Health: '04',
  Legal: '05',
  School: '06',
  Family: '07',
  Clients: '08',
  Projects: '09',
  Archive: '10',
  Review: '11',
};

// Get numbered folder name for disk operations
export function getCategoryFolderName(category: Category): string {
  const names: Record<Category, string> = {
    Work: '01 Work',
    Money: '02 Money',
    Home: '03 Home',
    Health: '04 Health',
    Legal: '05 Legal',
    School: '06 School',
    Family: '07 Family',
    Clients: '08 Clients',
    Projects: '09 Projects',
    Archive: '10 Archive',
    Review: '11 Review',
  };
  return names[category];
}

// Get display name (without number prefix)
export function getCategoryDisplayName(category: Category): string {
  const names: Record<Category, string> = {
    Work: 'Work',
    Money: 'Money',
    Home: 'Home',
    Health: 'Health',
    Legal: 'Legal',
    School: 'School',
    Family: 'Family',
    Clients: 'Clients',
    Projects: 'Projects',
    Archive: 'Archive',
    Review: 'Review',
  };
  return names[category];
}

// ============================================
// Document Types
// ============================================

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
  | 'Certificate'
  | 'ID'
  | 'Itinerary'
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
  'Certificate',
  'ID',
  'Itinerary',
  'Unknown',
] as const;

// ============================================
// Classification Types
// ============================================

export interface DetectedEntity {
  type: 'company' | 'person' | 'date' | 'amount' | 'project' | 'client';
  value: string;
  confidence?: number;
}

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

// ============================================
// Confidence Utilities
// ============================================

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'needs_review';

/**
 * Get confidence level from numeric confidence
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.70) return 'medium';
  if (confidence >= 0.50) return 'low';
  return 'needs_review';
}

/**
 * Check if file should be routed to Review folder
 */
export function shouldRouteToReview(confidence: number, threshold = 0.45): boolean {
  return confidence < threshold;
}

/**
 * Get confidence threshold for Review routing
 */
export const REVIEW_CONFIDENCE_THRESHOLD = 0.45;

// ============================================
// Category Metadata for UI
// ============================================

export interface CategoryMeta {
  icon: string;
  color: string;
  description: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Work: {
    icon: 'briefcase',
    color: '#14B8A6',
    description: 'Employment, resumes, career',
  },
  Money: {
    icon: 'dollar-sign',
    color: '#10B981',
    description: 'Banking, taxes, receipts',
  },
  Home: {
    icon: 'home',
    color: '#F59E0B',
    description: 'Property, utilities, warranties',
  },
  Health: {
    icon: 'heart',
    color: '#EF4444',
    description: 'Medical records, prescriptions',
  },
  Legal: {
    icon: 'scale',
    color: '#6366F1',
    description: 'Contracts, IDs, licenses',
  },
  School: {
    icon: 'graduation-cap',
    color: '#8B5CF6',
    description: 'Education, courses, research',
  },
  Family: {
    icon: 'users',
    color: '#EC4899',
    description: 'Family & friends, personal',
  },
  Clients: {
    icon: 'building',
    color: '#F97316',
    description: 'Client docs, business',
  },
  Projects: {
    icon: 'folder-kanban',
    color: '#06B6D4',
    description: 'Active projects',
  },
  Archive: {
    icon: 'archive',
    color: '#6B7280',
    description: 'Old/inactive documents',
  },
  Review: {
    icon: 'alert-circle',
    color: '#EAB308',
    description: 'Needs manual sorting',
  },
};

// ============================================
// Subcategory Maps (AI can create additional)
// ============================================

export const SUBCATEGORIES: Record<Category, readonly string[] | null> = {
  Work: ['Resumes', 'Performance', 'Payslips', 'Benefits', 'Training'],
  Money: ['Banking', 'Taxes', 'Investments', 'Receipts', 'Bills', 'Insurance'],
  Home: ['Property', 'Vehicle', 'Maintenance', 'Utilities', 'Warranties'],
  Health: ['Records', 'Prescriptions', 'Insurance', 'LabResults', 'Appointments'],
  Legal: ['Contracts', 'Agreements', 'Licenses', 'IDs', 'Wills'],
  School: ['Courses', 'Certifications', 'Research', 'Transcripts', 'Applications'],
  Family: null,   // Dynamic: family member names
  Clients: null,  // Dynamic: client names
  Projects: null, // Dynamic: project names
  Archive: ['2024', '2023', '2022', '2021', 'Older'],
  Review: null,   // No subfolders - needs manual sorting
};

/**
 * Get suggested subfolders for a category
 */
export function getSuggestedSubfolders(category: Category): readonly string[] {
  return SUBCATEGORIES[category] ?? [];
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Check if a string is a valid Category
 */
export function isValidCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

/**
 * Check if a string is a valid DocumentType
 */
export function isValidDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType);
}

/**
 * Normalize a folder name to a Category (returns Review for unknown)
 * Handles synonyms and number prefixes
 * Must match Rust category.rs normalize_folder function
 */
export function normalizeCategory(raw: string): Category {
  // Strip any number prefix (e.g., "01 Work" -> "work")
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/^\d{1,2}\s+/, '');

  // Direct matches
  const directMatch = CATEGORIES.find(c => c.toLowerCase() === cleaned);
  if (directMatch) return directMatch;

  // Synonym map - must match Rust category.rs
  const synonyms: Record<string, Category> = {
    // Work (01) - employment, career, job-related
    career: 'Work',
    employment: 'Work',
    job: 'Work',
    jobs: 'Work',
    resume: 'Work',
    resumes: 'Work',
    cv: 'Work',
    performance: 'Work',
    payroll: 'Work',
    payslips: 'Work',
    payslip: 'Work',
    employer: 'Work',
    trabajo: 'Work',
    carrera: 'Work',
    empleo: 'Work',

    // Money (02) - finances, banking, taxes
    finance: 'Money',
    finances: 'Money',
    financial: 'Money',
    banking: 'Money',
    bank: 'Money',
    taxes: 'Money',
    tax: 'Money',
    investments: 'Money',
    investment: 'Money',
    receipts: 'Money',
    receipt: 'Money',
    accounting: 'Money',
    bills: 'Money',
    budget: 'Money',
    dinero: 'Money',
    finanzas: 'Money',

    // Home (03) - property, housing, utilities
    property: 'Home',
    house: 'Home',
    housing: 'Home',
    'real estate': 'Home',
    realestate: 'Home',
    car: 'Home',
    vehicle: 'Home',
    auto: 'Home',
    mortgage: 'Home',
    deed: 'Home',
    title: 'Home',
    apartment: 'Home',
    rent: 'Home',
    lease: 'Home',
    utilities: 'Home',
    warranty: 'Home',
    warranties: 'Home',
    casa: 'Home',
    propiedad: 'Home',
    hogar: 'Home',

    // Health (04) - medical, wellness
    medical: 'Health',
    healthcare: 'Health',
    wellness: 'Health',
    doctor: 'Health',
    doctors: 'Health',
    dental: 'Health',
    vision: 'Health',
    prescriptions: 'Health',
    prescription: 'Health',
    hospital: 'Health',
    lab: 'Health',
    labs: 'Health',
    salud: 'Health',
    medico: 'Health',

    // Legal (05) - contracts, legal matters, identity documents
    contracts: 'Legal',
    contract: 'Legal',
    agreements: 'Legal',
    agreement: 'Legal',
    law: 'Legal',
    attorney: 'Legal',
    lawyer: 'Legal',
    court: 'Legal',
    license: 'Legal',
    licenses: 'Legal',
    wills: 'Legal',
    will: 'Legal',
    'power of attorney': 'Legal',
    poa: 'Legal',
    identity: 'Legal',
    id: 'Legal',
    ids: 'Legal',
    identification: 'Legal',
    passport: 'Legal',
    passports: 'Legal',
    ssn: 'Legal',
    'social security': 'Legal',
    'birth certificate': 'Legal',
    citizenship: 'Legal',
    identidad: 'Legal',
    identificacion: 'Legal',

    // School (06) - education, learning
    education: 'School',
    learning: 'School',
    university: 'School',
    college: 'School',
    academic: 'School',
    studies: 'School',
    student: 'School',
    courses: 'School',
    course: 'School',
    training: 'School',
    certification: 'School',
    certifications: 'School',
    research: 'School',
    escuela: 'School',
    aprendizaje: 'School',
    educacion: 'School',

    // Family (07) - personal relationships, kids
    familia: 'Family',
    kids: 'Family',
    children: 'Family',
    spouse: 'Family',
    relatives: 'Family',
    personal: 'Family',
    friends: 'Family',
    amigos: 'Family',

    // Clients (08) - client-related, business clients
    client: 'Clients',
    customers: 'Clients',
    customer: 'Clients',
    business: 'Clients',
    company: 'Clients',
    corporate: 'Clients',
    vendors: 'Clients',
    vendor: 'Clients',
    suppliers: 'Clients',
    clientes: 'Clients',
    negocios: 'Clients',
    empresa: 'Clients',

    // Projects (09) - active projects
    project: 'Projects',
    engagements: 'Projects',
    engagement: 'Projects',
    cases: 'Projects',
    case: 'Projects',
    initiatives: 'Projects',
    proyectos: 'Projects',

    // Archive (10) - historical, inactive, old documents
    archived: 'Archive',
    old: 'Archive',
    historical: 'Archive',
    past: 'Archive',
    inactive: 'Archive',
    completed: 'Archive',
    done: 'Archive',
    archivo: 'Archive',
    travel: 'Archive',
    trips: 'Archive',
    trip: 'Archive',
    vacation: 'Archive',
    vacations: 'Archive',
    viajes: 'Archive',
    viaje: 'Archive',

    // Review (11) - uncategorized, needs manual sorting
    inbox: 'Review',
    unsorted: 'Review',
    unknown: 'Review',
    other: 'Review',
    misc: 'Review',
    miscellaneous: 'Review',
    revisar: 'Review',
    pending: 'Review',
  };

  return synonyms[cleaned] ?? 'Review';
}
