//! Category vocabulary and normalization
//!
//! SINGLE SOURCE OF TRUTH for folder categories.
//! 11-folder numbered system for consistent sort order across file systems.
//!
//! Numbers ensure folders always appear in the same order:
//! 01 Work, 02 Money, 03 Home, ... 11 Review

use serde::{Deserialize, Serialize};
use std::fmt;

/// Top-level folder categories - 11 numbered smart folders (approved vocabulary)
///
/// English / Spanish (MX):
/// 1. Work / Trabajo
/// 2. Money / Dinero
/// 3. Home / Casa
/// 4. Health / Salud
/// 5. Legal / Legal
/// 6. School / Escuela
/// 7. Family & Friends / Familia y Amigos
/// 8. Clients / Clientes
/// 9. Projects / Proyectos
/// 10. Archive / Archivo
/// 11. Review / Revisar
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "PascalCase")]
pub enum Category {
    Work,       // 01 - Employment, resumes, performance reviews, career docs
    Money,      // 02 - Banking, taxes, investments, receipts, budgets
    Home,       // 03 - Mortgage/rent, utilities, repairs, warranties, property
    Health,     // 04 - Medical records, insurance, prescriptions, dental, vision
    Legal,      // 05 - Contracts, agreements, legal correspondence, licenses
    School,     // 06 - Education, courses, certifications, transcripts, research
    Family,     // 07 - Family & friends documents, kids' records, personal relationships
    Clients,    // 08 - Client-specific documents (freelancers/SMB)
    Projects,   // 09 - Active projects (AI creates subfolders by project name)
    Archive,    // 10 - Old/inactive items, historical records by year
    Review,     // 11 - Low confidence items needing user attention
}

impl Category {
    /// All valid categories in numbered order (for display and iteration)
    pub const ALL: &'static [Category] = &[
        Category::Work,     // 01
        Category::Money,    // 02
        Category::Home,     // 03
        Category::Health,   // 04
        Category::Legal,    // 05
        Category::School,   // 06
        Category::Family,   // 07
        Category::Clients,  // 08
        Category::Projects, // 09
        Category::Archive,  // 10
        Category::Review,   // 11
    ];

    /// Returns the category name for display (without number prefix)
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

    /// Returns the numbered folder name for disk operations
    /// e.g., "01 Work", "02 Money", "11 Review"
    pub fn folder_name(&self) -> &'static str {
        match self {
            Category::Work => "01 Work",
            Category::Money => "02 Money",
            Category::Home => "03 Home",
            Category::Health => "04 Health",
            Category::Legal => "05 Legal",
            Category::School => "06 School",
            Category::Family => "07 Family",
            Category::Clients => "08 Clients",
            Category::Projects => "09 Projects",
            Category::Archive => "10 Archive",
            Category::Review => "11 Review",
        }
    }

    /// Returns the folder number prefix
    pub fn number(&self) -> u8 {
        match self {
            Category::Work => 1,
            Category::Money => 2,
            Category::Home => 3,
            Category::Health => 4,
            Category::Legal => 5,
            Category::School => 6,
            Category::Family => 7,
            Category::Clients => 8,
            Category::Projects => 9,
            Category::Archive => 10,
            Category::Review => 11,
        }
    }

    /// Parse from string, returning Review for unknown values
    pub fn from_str_or_review(s: &str) -> Self {
        normalize_folder(s)
    }

    /// Get confidence threshold - items below this go to Review
    pub fn review_confidence_threshold() -> f64 {
        0.70
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
///
/// Approved 11 folders: Work, Money, Home, Health, Legal, School, Family & Friends, Clients, Projects, Archive, Review
pub fn normalize_folder(raw: &str) -> Category {
    let normalized = raw.to_lowercase().trim().to_string();

    // Strip any number prefix (e.g., "01 Work" -> "work")
    let cleaned = normalized
        .trim_start_matches(|c: char| c.is_ascii_digit() || c == ' ')
        .trim();

    match cleaned {
        // Work (01) - employment, career, job-related
        "work" | "career" | "employment" | "job" | "jobs" | "resume" | "resumes"
        | "cv" | "performance" | "payroll" | "payslips" | "payslip" | "employer"
        | "trabajo" | "carrera" | "empleo" => Category::Work,

        // Money (02) - finances, banking, taxes
        "money" | "finance" | "finances" | "financial" | "banking" | "bank"
        | "taxes" | "tax" | "investments" | "investment" | "receipts" | "receipt"
        | "accounting" | "bills" | "budget" | "dinero" | "finanzas" => Category::Money,

        // Home (03) - property, housing, utilities
        "home" | "property" | "house" | "housing" | "real estate" | "realestate"
        | "car" | "vehicle" | "auto" | "mortgage" | "deed" | "title"
        | "apartment" | "rent" | "lease" | "utilities" | "warranty" | "warranties"
        | "casa" | "propiedad" | "hogar" => Category::Home,

        // Health (04) - medical, wellness
        "health" | "medical" | "healthcare" | "wellness" | "doctor" | "doctors"
        | "dental" | "vision" | "prescriptions" | "prescription" | "hospital"
        | "lab" | "labs" | "salud" | "medico" => Category::Health,

        // Legal (05) - contracts, legal matters, identity documents
        "legal" | "contracts" | "contract" | "agreements" | "agreement"
        | "law" | "attorney" | "lawyer" | "court" | "license" | "licenses"
        | "wills" | "will" | "power of attorney" | "poa"
        | "identity" | "id" | "ids" | "identification" | "passport" | "passports"
        | "ssn" | "social security" | "birth certificate" | "citizenship"
        | "identidad" | "identificacion" => Category::Legal,

        // School (06) - education, learning
        "school" | "education" | "learning" | "university" | "college"
        | "academic" | "studies" | "student" | "courses" | "course"
        | "training" | "certification" | "certifications" | "research"
        | "escuela" | "aprendizaje" | "educacion" => Category::School,

        // Family (07) - personal relationships, kids
        "family" | "familia" | "kids" | "children" | "spouse" | "relatives"
        | "personal" | "friends" | "amigos" => Category::Family,

        // Clients (08) - client-related, business clients
        "clients" | "client" | "customers" | "customer" | "business"
        | "company" | "corporate" | "vendors" | "vendor" | "suppliers"
        | "clientes" | "negocios" | "empresa" => Category::Clients,

        // Projects (09) - active projects
        "projects" | "project" | "engagements" | "engagement" | "cases" | "case"
        | "initiatives" | "proyectos" => Category::Projects,

        // Archive (10) - historical, inactive, old documents
        "archive" | "archived" | "old" | "historical" | "past" | "inactive"
        | "completed" | "done" | "archivo"
        | "travel" | "trips" | "trip" | "vacation" | "vacations" | "viajes" | "viaje" => Category::Archive,

        // Review (11) - uncategorized, needs manual sorting
        "review" | "inbox" | "unsorted" | "unknown" | "other" | "misc"
        | "miscellaneous" | "revisar" | "pending" => Category::Review,

        // Default fallback
        _ => Category::Review,
    }
}

/// Suggested subfolders for each category (AI can create additional ones)
pub fn suggested_subfolders(category: &Category) -> &'static [&'static str] {
    match category {
        Category::Work => &["Resumes", "Performance", "Payslips", "Benefits", "Training"],
        Category::Money => &["Banking", "Taxes", "Investments", "Receipts", "Bills", "Insurance"],
        Category::Home => &["Property", "Vehicle", "Maintenance", "Utilities", "Warranties"],
        Category::Health => &["Records", "Prescriptions", "Insurance", "LabResults", "Appointments"],
        Category::Legal => &["Contracts", "Agreements", "Licenses", "IDs", "Wills"],
        Category::School => &["Courses", "Certifications", "Research", "Transcripts", "Applications"],
        Category::Family => &[], // Dynamic: family member names
        Category::Clients => &[], // Dynamic: client names
        Category::Projects => &[], // Dynamic: project names
        Category::Archive => &["2024", "2023", "2022", "2021", "Older"],
        Category::Review => &[], // No subfolders - needs manual sorting
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_direct_matches() {
        assert_eq!(normalize_folder("Work"), Category::Work);
        assert_eq!(normalize_folder("Money"), Category::Money);
        assert_eq!(normalize_folder("Home"), Category::Home);
        assert_eq!(normalize_folder("Health"), Category::Health);
        assert_eq!(normalize_folder("Legal"), Category::Legal);
        assert_eq!(normalize_folder("School"), Category::School);
        assert_eq!(normalize_folder("Family"), Category::Family);
        assert_eq!(normalize_folder("Clients"), Category::Clients);
        assert_eq!(normalize_folder("Projects"), Category::Projects);
        assert_eq!(normalize_folder("Archive"), Category::Archive);
        assert_eq!(normalize_folder("Review"), Category::Review);
    }

    #[test]
    fn test_synonym_normalization() {
        // Money synonyms
        assert_eq!(normalize_folder("finance"), Category::Money);
        assert_eq!(normalize_folder("banking"), Category::Money);
        assert_eq!(normalize_folder("taxes"), Category::Money);

        // Health synonyms
        assert_eq!(normalize_folder("medical"), Category::Health);
        assert_eq!(normalize_folder("healthcare"), Category::Health);

        // School synonyms
        assert_eq!(normalize_folder("education"), Category::School);
        assert_eq!(normalize_folder("learning"), Category::School);

        // Work synonyms
        assert_eq!(normalize_folder("career"), Category::Work);
        assert_eq!(normalize_folder("employment"), Category::Work);

        // Home synonyms
        assert_eq!(normalize_folder("property"), Category::Home);
        assert_eq!(normalize_folder("house"), Category::Home);

        // Clients synonyms
        assert_eq!(normalize_folder("business"), Category::Clients);
        assert_eq!(normalize_folder("customer"), Category::Clients);
    }

    #[test]
    fn test_numbered_folder_names() {
        assert_eq!(Category::Work.folder_name(), "01 Work");
        assert_eq!(Category::Money.folder_name(), "02 Money");
        assert_eq!(Category::Archive.folder_name(), "10 Archive");
        assert_eq!(Category::Review.folder_name(), "11 Review");
    }

    #[test]
    fn test_strip_number_prefix() {
        // Should normalize folder names even with number prefix
        assert_eq!(normalize_folder("01 Work"), Category::Work);
        assert_eq!(normalize_folder("02 Money"), Category::Money);
        assert_eq!(normalize_folder("11 Review"), Category::Review);
    }

    #[test]
    fn test_case_insensitivity() {
        assert_eq!(normalize_folder("MONEY"), Category::Money);
        assert_eq!(normalize_folder("money"), Category::Money);
        assert_eq!(normalize_folder("Money"), Category::Money);
        assert_eq!(normalize_folder("MoNeY"), Category::Money);
    }

    #[test]
    fn test_unknown_defaults_to_review() {
        assert_eq!(normalize_folder("xyz123"), Category::Review);
        assert_eq!(normalize_folder(""), Category::Review);
        assert_eq!(normalize_folder("random"), Category::Review);
    }

    #[test]
    fn test_spanish_synonyms() {
        assert_eq!(normalize_folder("dinero"), Category::Money);
        assert_eq!(normalize_folder("finanzas"), Category::Money);
        assert_eq!(normalize_folder("salud"), Category::Health);
        assert_eq!(normalize_folder("familia"), Category::Family);
        assert_eq!(normalize_folder("trabajo"), Category::Work);
        assert_eq!(normalize_folder("archivo"), Category::Archive);
        assert_eq!(normalize_folder("escuela"), Category::School);
        assert_eq!(normalize_folder("clientes"), Category::Clients);
        assert_eq!(normalize_folder("revisar"), Category::Review);
    }

    #[test]
    fn test_all_categories_represented() {
        assert_eq!(Category::ALL.len(), 11);
    }

    #[test]
    fn test_display_trait() {
        assert_eq!(format!("{}", Category::Money), "Money");
        assert_eq!(format!("{}", Category::Family), "Family");
        assert_eq!(format!("{}", Category::Archive), "Archive");
    }

    #[test]
    fn test_category_numbers() {
        assert_eq!(Category::Work.number(), 1);
        assert_eq!(Category::Money.number(), 2);
        assert_eq!(Category::Home.number(), 3);
        assert_eq!(Category::Health.number(), 4);
        assert_eq!(Category::Legal.number(), 5);
        assert_eq!(Category::School.number(), 6);
        assert_eq!(Category::Family.number(), 7);
        assert_eq!(Category::Clients.number(), 8);
        assert_eq!(Category::Projects.number(), 9);
        assert_eq!(Category::Archive.number(), 10);
        assert_eq!(Category::Review.number(), 11);
    }

    #[test]
    fn test_legacy_categories_map_correctly() {
        // Old categories should map to new ones
        assert_eq!(normalize_folder("Identity"), Category::Legal); // Identity → Legal
        assert_eq!(normalize_folder("Finance"), Category::Money);   // Finance → Money
        assert_eq!(normalize_folder("Property"), Category::Home);   // Property → Home
        assert_eq!(normalize_folder("Learning"), Category::School); // Learning → School
        assert_eq!(normalize_folder("Career"), Category::Work);     // Career → Work
        assert_eq!(normalize_folder("Business"), Category::Clients); // Business → Clients
        assert_eq!(normalize_folder("Travel"), Category::Archive);  // Travel → Archive
    }
}
