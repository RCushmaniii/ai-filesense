//! PDF Parser (Group 3)
//!
//! Handles: .pdf files
//! Strategy: Extract text layer using pdf-extract

use super::{DocumentMetadata, ParseError, ParsedDocument};
use std::path::Path;

/// Extract text content from a PDF file
pub fn extract_pdf(path: &Path, max_chars: usize) -> Result<ParsedDocument, ParseError> {
    // Use pdf-extract to get text content
    let content = pdf_extract::extract_text(path)
        .map_err(|e| ParseError::ParseError(format!("Failed to extract PDF text: {}", e)))?;

    // Truncate to max_chars
    let content = if content.len() > max_chars {
        content[..max_chars].to_string()
    } else {
        content
    };

    // Clean up the extracted text
    let content = clean_pdf_text(&content);

    // Calculate word count
    let word_count = content.split_whitespace().count() as u32;

    // Calculate confidence based on extraction quality
    // PDFs with good text layers have high confidence
    // Scanned PDFs (empty or garbage text) have low confidence
    let confidence = calculate_extraction_confidence(&content, word_count);

    Ok(ParsedDocument {
        content,
        metadata: DocumentMetadata {
            word_count: Some(word_count),
            ..Default::default()
        },
        extraction_confidence: confidence,
    })
}

/// Clean up extracted PDF text
fn clean_pdf_text(text: &str) -> String {
    text.lines()
        .map(|line| {
            // Remove excessive whitespace within lines
            line.split_whitespace().collect::<Vec<_>>().join(" ")
        })
        .filter(|line| !line.is_empty())
        // Remove lines that are likely garbage (very short or just symbols)
        .filter(|line| {
            let alpha_count = line.chars().filter(|c| c.is_alphabetic()).count();
            let total_count = line.chars().count();
            // Line should have at least 30% alphabetic characters
            total_count > 0 && (alpha_count as f64 / total_count as f64) > 0.3
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Calculate confidence score based on extraction quality
fn calculate_extraction_confidence(content: &str, word_count: u32) -> f64 {
    // Empty or nearly empty content = likely scanned PDF
    if word_count < 5 {
        return 0.20;
    }

    // Check for signs of good text extraction
    let total_chars = content.len();
    let alpha_chars = content.chars().filter(|c| c.is_alphabetic()).count();
    let alpha_ratio = alpha_chars as f64 / total_chars.max(1) as f64;

    // Check for common words that indicate readable text
    let common_words = ["the", "and", "is", "to", "of", "a", "in", "for", "that", "it"];
    let content_lower = content.to_lowercase();
    let common_word_count = common_words
        .iter()
        .filter(|w| content_lower.contains(*w))
        .count();

    // Score components
    let word_score = if word_count > 100 { 0.4 } else { (word_count as f64 / 100.0) * 0.4 };
    let alpha_score = alpha_ratio * 0.3;
    let common_word_score = (common_word_count as f64 / common_words.len() as f64) * 0.3;

    let confidence = word_score + alpha_score + common_word_score;

    // Clamp to reasonable range
    confidence.clamp(0.20, 0.95)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_pdf_text() {
        let input = "Hello   World\n\nThis is a test.\n\n---\n\nMore content here.";
        let cleaned = clean_pdf_text(input);
        assert!(cleaned.contains("Hello World"));
        assert!(cleaned.contains("This is a test"));
    }

    #[test]
    fn test_confidence_empty() {
        let confidence = calculate_extraction_confidence("", 0);
        assert!(confidence < 0.3);
    }

    #[test]
    fn test_confidence_good_text() {
        let text = "The quick brown fox jumps over the lazy dog. This is a test document with good text content that should have high confidence.";
        let word_count = text.split_whitespace().count() as u32;
        let confidence = calculate_extraction_confidence(text, word_count);
        assert!(confidence > 0.5);
    }
}
