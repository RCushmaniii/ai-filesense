//! Plain Text Parser (Group 1)
//!
//! Handles: .txt, .md, .markdown, .log, .csv, .tsv
//! Strategy: Direct text reading with encoding detection

use super::{DocumentMetadata, ParseError, ParsedDocument};
use std::fs::File;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;

/// Extract text content from a plain text file
pub fn extract_text(path: &Path, max_chars: usize) -> Result<ParsedDocument, ParseError> {
    let file = File::open(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            ParseError::NotFound(path.to_string_lossy().to_string())
        } else {
            ParseError::ReadError(e.to_string())
        }
    })?;

    let mut reader = BufReader::new(file);

    // Try to detect BOM and handle encoding
    let content = read_with_encoding_detection(&mut reader, max_chars)?;

    // Count words for metadata
    let word_count = content.split_whitespace().count() as u32;

    // Calculate extraction confidence
    // High confidence for text files with substantial content
    let confidence = if word_count > 100 {
        0.95
    } else if word_count > 20 {
        0.85
    } else if word_count > 5 {
        0.70
    } else {
        0.50
    };

    Ok(ParsedDocument {
        content,
        metadata: DocumentMetadata {
            word_count: Some(word_count),
            ..Default::default()
        },
        extraction_confidence: confidence,
    })
}

/// Read file content with basic encoding detection
fn read_with_encoding_detection(
    reader: &mut BufReader<File>,
    max_chars: usize,
) -> Result<String, ParseError> {
    // Read first few bytes to detect BOM
    let mut bom_buffer = [0u8; 3];
    let bytes_read = reader.read(&mut bom_buffer).unwrap_or(0);

    // Determine encoding based on BOM
    let (skip_bytes, is_utf16) = match &bom_buffer[..bytes_read] {
        // UTF-8 BOM
        [0xEF, 0xBB, 0xBF, ..] => (3, false),
        // UTF-16 LE BOM
        [0xFF, 0xFE, ..] => (2, true),
        // UTF-16 BE BOM
        [0xFE, 0xFF, ..] => (2, true),
        // No BOM, assume UTF-8
        _ => (0, false),
    };

    if is_utf16 {
        // For UTF-16, we'd need proper conversion - for now, return a placeholder
        // Most text files are UTF-8, so this is rare
        return Err(ParseError::EncodingError(
            "UTF-16 encoding not fully supported, please convert to UTF-8".to_string(),
        ));
    }

    // Reset reader and skip BOM if present
    let file = reader.get_ref().try_clone().map_err(|e| ParseError::ReadError(e.to_string()))?;
    let mut reader = BufReader::new(file);

    if skip_bytes > 0 {
        let mut skip = vec![0u8; skip_bytes];
        reader.read_exact(&mut skip).ok();
    }

    // Read content line by line, respecting max_chars
    let mut content = String::new();
    let mut total_chars = 0;

    for line in reader.lines() {
        let line = line.map_err(|e| ParseError::EncodingError(e.to_string()))?;

        if total_chars + line.len() > max_chars {
            // Take partial line to reach max_chars
            let remaining = max_chars - total_chars;
            content.push_str(&line[..remaining.min(line.len())]);
            break;
        }

        content.push_str(&line);
        content.push('\n');
        total_chars += line.len() + 1;

        if total_chars >= max_chars {
            break;
        }
    }

    // Clean up the content - normalize whitespace, remove control characters
    let content = content
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
        .collect::<String>()
        .trim()
        .to_string();

    Ok(content)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_extract_simple_text() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(file, "Hello, this is a test document.").unwrap();
        writeln!(file, "It has multiple lines.").unwrap();

        let result = extract_text(file.path(), 1000).unwrap();
        assert!(result.content.contains("Hello"));
        assert!(result.content.contains("multiple lines"));
        assert!(result.extraction_confidence > 0.5);
    }

    #[test]
    fn test_max_chars_limit() {
        let mut file = NamedTempFile::new().unwrap();
        for _ in 0..100 {
            writeln!(file, "This is a long line of text that repeats.").unwrap();
        }

        let result = extract_text(file.path(), 100).unwrap();
        assert!(result.content.len() <= 110); // Allow some buffer for line breaks
    }
}
