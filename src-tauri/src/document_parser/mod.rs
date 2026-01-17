//! Document Parser Module
//!
//! Provides content extraction for various document types.
//! Organized by parsing + analysis method per the architecture doc:
//!
//! - Group 1 (Plain Text): .txt, .md, .log
//! - Group 2 (Office Open XML): .docx, .pptx
//! - Group 3 (PDF): .pdf (text-based)

mod text;
mod docx;
mod pptx;
mod pdf;

use std::path::Path;

/// Result of parsing a document
#[derive(Debug, Clone)]
pub struct ParsedDocument {
    /// Extracted text content (first N characters for AI analysis)
    pub content: String,
    /// Document metadata (title, author, etc.)
    pub metadata: DocumentMetadata,
    /// Confidence in extraction quality (0.0 - 1.0)
    pub extraction_confidence: f64,
}

/// Document metadata extracted during parsing
#[derive(Debug, Clone, Default)]
pub struct DocumentMetadata {
    pub title: Option<String>,
    pub author: Option<String>,
    pub subject: Option<String>,
    pub keywords: Vec<String>,
    pub page_count: Option<u32>,
    pub word_count: Option<u32>,
}

/// Errors that can occur during document parsing
#[derive(Debug)]
pub enum ParseError {
    /// File not found
    NotFound(String),
    /// Unsupported file type
    UnsupportedType(String),
    /// Failed to read file
    ReadError(String),
    /// Failed to parse document structure
    ParseError(String),
    /// Encoding issues
    EncodingError(String),
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseError::NotFound(p) => write!(f, "File not found: {}", p),
            ParseError::UnsupportedType(t) => write!(f, "Unsupported file type: {}", t),
            ParseError::ReadError(e) => write!(f, "Read error: {}", e),
            ParseError::ParseError(e) => write!(f, "Parse error: {}", e),
            ParseError::EncodingError(e) => write!(f, "Encoding error: {}", e),
        }
    }
}

impl std::error::Error for ParseError {}

/// Main entry point for document parsing
///
/// Extracts text content from a document, limited to max_chars.
/// Returns a ParsedDocument with content, metadata, and confidence score.
pub fn extract_document_content(path: &Path, max_chars: usize) -> Result<ParsedDocument, ParseError> {
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    match extension.as_str() {
        // Group 1: Plain Text
        "txt" | "md" | "markdown" | "log" | "csv" | "tsv" => {
            text::extract_text(path, max_chars)
        }

        // Group 2: Office Open XML
        "docx" => docx::extract_docx(path, max_chars),
        "pptx" => pptx::extract_pptx(path, max_chars),

        // Group 3: PDF
        "pdf" => pdf::extract_pdf(path, max_chars),

        // Unsupported
        _ => Err(ParseError::UnsupportedType(extension)),
    }
}

/// Check if a file type is supported for content extraction
pub fn is_supported_type(extension: &str) -> bool {
    matches!(
        extension.to_lowercase().as_str(),
        "txt" | "md" | "markdown" | "log" | "csv" | "tsv" | "docx" | "pptx" | "pdf"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_supported_types() {
        assert!(is_supported_type("txt"));
        assert!(is_supported_type("TXT"));
        assert!(is_supported_type("docx"));
        assert!(is_supported_type("pdf"));
        assert!(is_supported_type("pptx"));
        assert!(!is_supported_type("exe"));
        assert!(!is_supported_type("unknown"));
    }
}
