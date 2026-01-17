//! Document type classification
//!
//! SINGLE SOURCE OF TRUTH for document types.
//! Per specification doc 04-ai-prompts-and-schemas.md

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

    /// Parse from string, defaulting to Unknown
    pub fn from_str_or_unknown(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "invoice" | "factura" => DocumentType::Invoice,
            "contract" | "contrato" => DocumentType::Contract,
            "resume" | "cv" | "curriculum" => DocumentType::Resume,
            "tax" | "impuesto" => DocumentType::Tax,
            "receipt" | "recibo" => DocumentType::Receipt,
            "letter" | "carta" => DocumentType::Letter,
            "report" | "reporte" | "informe" => DocumentType::Report,
            "notes" | "notas" | "memo" => DocumentType::Notes,
            "statement" | "estado" => DocumentType::Statement,
            "application" | "solicitud" => DocumentType::Application,
            "policy" | "poliza" => DocumentType::Policy,
            "manual" | "guia" => DocumentType::Manual,
            "presentation" | "presentacion" => DocumentType::Presentation,
            "spreadsheet" | "hoja" => DocumentType::Spreadsheet,
            _ => DocumentType::Unknown,
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

/// Detection keywords for each document type (English + Spanish)
pub fn detection_keywords(doc_type: &DocumentType) -> &'static [&'static str] {
    match doc_type {
        DocumentType::Invoice => &[
            "invoice", "bill", "amount due", "payment due",
            "total due", "remit to", "factura", "monto"
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
            "form 1040", "schedule", "declaracion"
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
            "effective date", "poliza"
        ],
        DocumentType::Manual => &[
            "manual", "guide", "instructions", "how to",
            "user guide", "guia"
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

    #[test]
    fn test_all_document_types_represented() {
        assert_eq!(DocumentType::ALL.len(), 15);
    }

    #[test]
    fn test_from_str_or_unknown() {
        assert_eq!(DocumentType::from_str_or_unknown("invoice"), DocumentType::Invoice);
        assert_eq!(DocumentType::from_str_or_unknown("factura"), DocumentType::Invoice);
        assert_eq!(DocumentType::from_str_or_unknown("random"), DocumentType::Unknown);
    }
}
