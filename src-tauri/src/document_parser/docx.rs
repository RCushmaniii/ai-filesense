//! DOCX Parser (Group 2 - Office Open XML)
//!
//! Handles: .docx files
//! Strategy: Unzip → read word/document.xml → extract text from XML

use super::{DocumentMetadata, ParseError, ParsedDocument};
use quick_xml::events::Event;
use quick_xml::Reader;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

/// Extract text content from a DOCX file
pub fn extract_docx(path: &Path, max_chars: usize) -> Result<ParsedDocument, ParseError> {
    let file = File::open(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            ParseError::NotFound(path.to_string_lossy().to_string())
        } else {
            ParseError::ReadError(e.to_string())
        }
    })?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| ParseError::ParseError(format!("Invalid DOCX file (not a valid ZIP): {}", e)))?;

    // Extract metadata from docProps/core.xml
    let metadata = extract_metadata(&mut archive).unwrap_or_default();

    // Extract text from word/document.xml
    let content = extract_document_text(&mut archive, max_chars)?;

    // Calculate confidence based on content quality
    let word_count = content.split_whitespace().count() as u32;
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
            ..metadata
        },
        extraction_confidence: confidence,
    })
}

/// Extract metadata from docProps/core.xml
fn extract_metadata(archive: &mut ZipArchive<File>) -> Result<DocumentMetadata, ParseError> {
    let mut metadata = DocumentMetadata::default();

    // Try to read core.xml for metadata
    if let Ok(mut core_file) = archive.by_name("docProps/core.xml") {
        let mut xml_content = String::new();
        if core_file.read_to_string(&mut xml_content).is_ok() {
            let mut reader = Reader::from_str(&xml_content);
            reader.config_mut().trim_text(true);

            let mut current_tag = String::new();
            let mut buf = Vec::new();

            loop {
                match reader.read_event_into(&mut buf) {
                    Ok(Event::Start(e)) => {
                        current_tag = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    }
                    Ok(Event::Text(e)) => {
                        let text = e.unescape().unwrap_or_default().to_string();
                        match current_tag.as_str() {
                            "dc:title" | "title" => metadata.title = Some(text),
                            "dc:creator" | "creator" => metadata.author = Some(text),
                            "dc:subject" | "subject" => metadata.subject = Some(text),
                            "cp:keywords" | "keywords" => {
                                metadata.keywords = text.split(',').map(|s| s.trim().to_string()).collect();
                            }
                            _ => {}
                        }
                    }
                    Ok(Event::Eof) => break,
                    Err(_) => break,
                    _ => {}
                }
                buf.clear();
            }
        }
    }

    Ok(metadata)
}

/// Extract text content from word/document.xml
fn extract_document_text(archive: &mut ZipArchive<File>, max_chars: usize) -> Result<String, ParseError> {
    let mut document_file = archive
        .by_name("word/document.xml")
        .map_err(|_| ParseError::ParseError("DOCX file missing word/document.xml".to_string()))?;

    let mut xml_content = String::new();
    document_file
        .read_to_string(&mut xml_content)
        .map_err(|e| ParseError::ReadError(e.to_string()))?;

    // Parse XML and extract text from <w:t> elements
    let mut reader = Reader::from_str(&xml_content);
    reader.config_mut().trim_text(true);

    let mut content = String::new();
    let mut in_text_element = false;
    let mut in_paragraph = false;
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                let name = e.name();
                let local_name = String::from_utf8_lossy(name.as_ref());

                match local_name.as_ref() {
                    "w:t" => in_text_element = true,
                    "w:p" => in_paragraph = true,
                    _ => {}
                }
            }
            Ok(Event::End(e)) => {
                let name = e.name();
                let local_name = String::from_utf8_lossy(name.as_ref());

                match local_name.as_ref() {
                    "w:t" => in_text_element = false,
                    "w:p" => {
                        if in_paragraph && !content.is_empty() {
                            content.push('\n');
                        }
                        in_paragraph = false;
                    }
                    _ => {}
                }
            }
            Ok(Event::Text(e)) => {
                if in_text_element {
                    let text = e.unescape().unwrap_or_default();
                    content.push_str(&text);

                    // Check if we've reached max_chars (char-safe for multi-byte UTF-8)
                    if content.chars().count() >= max_chars {
                        content = content.chars().take(max_chars).collect::<String>();
                        break;
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => {
                return Err(ParseError::ParseError(format!("XML parse error: {}", e)));
            }
            _ => {}
        }
        buf.clear();
    }

    // Clean up: normalize whitespace
    let content = content
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    Ok(content)
}

#[cfg(test)]
mod tests {
    // Tests would require actual .docx files
    // In production, consider adding test fixtures
}
