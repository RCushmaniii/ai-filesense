//! PPTX Parser (Group 2 - Office Open XML)
//!
//! Handles: .pptx files
//! Strategy: Unzip → read ppt/slides/slide*.xml → extract text from XML

use super::{DocumentMetadata, ParseError, ParsedDocument};
use quick_xml::events::Event;
use quick_xml::Reader;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use zip::ZipArchive;

/// Extract text content from a PPTX file
pub fn extract_pptx(path: &Path, max_chars: usize) -> Result<ParsedDocument, ParseError> {
    let file = File::open(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            ParseError::NotFound(path.to_string_lossy().to_string())
        } else {
            ParseError::ReadError(e.to_string())
        }
    })?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| ParseError::ParseError(format!("Invalid PPTX file (not a valid ZIP): {}", e)))?;

    // Extract metadata from docProps/core.xml
    let metadata = extract_metadata(&mut archive).unwrap_or_default();

    // Extract text from all slides
    let content = extract_slides_text(&mut archive, max_chars)?;

    // Calculate confidence based on content quality
    let word_count = content.split_whitespace().count() as u32;
    let confidence = if word_count > 100 {
        0.95
    } else if word_count > 20 {
        0.85
    } else if word_count > 5 {
        0.70
    } else {
        // Presentations often have less text than documents
        0.60
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

/// Extract metadata from docProps/core.xml (same structure as DOCX)
fn extract_metadata(archive: &mut ZipArchive<File>) -> Result<DocumentMetadata, ParseError> {
    let mut metadata = DocumentMetadata::default();

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

    // Count slides
    let slide_count = count_slides(archive);
    metadata.page_count = Some(slide_count);

    Ok(metadata)
}

/// Count the number of slides in the presentation
fn count_slides(archive: &mut ZipArchive<File>) -> u32 {
    let mut count = 0;
    for i in 0..archive.len() {
        if let Ok(file) = archive.by_index(i) {
            let name = file.name();
            if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
                count += 1;
            }
        }
    }
    count
}

/// Extract text from all slide XML files
fn extract_slides_text(archive: &mut ZipArchive<File>, max_chars: usize) -> Result<String, ParseError> {
    // First, collect slide file names (they need to be sorted for proper order)
    let mut slide_names: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        if let Ok(file) = archive.by_index(i) {
            let name = file.name().to_string();
            if name.starts_with("ppt/slides/slide") && name.ends_with(".xml") {
                slide_names.push(name);
            }
        }
    }

    // Sort slides by number (slide1.xml, slide2.xml, etc.)
    slide_names.sort_by(|a, b| {
        let num_a = extract_slide_number(a);
        let num_b = extract_slide_number(b);
        num_a.cmp(&num_b)
    });

    let mut content = String::new();
    let mut slide_num = 1;

    for slide_name in slide_names {
        if content.chars().count() >= max_chars {
            break;
        }

        if let Ok(mut slide_file) = archive.by_name(&slide_name) {
            let mut xml_content = String::new();
            if slide_file.read_to_string(&mut xml_content).is_ok() {
                let slide_text = extract_text_from_slide_xml(&xml_content);
                if !slide_text.is_empty() {
                    if !content.is_empty() {
                        content.push_str("\n\n");
                    }
                    content.push_str(&format!("[Slide {}]\n{}", slide_num, slide_text));
                }
            }
        }
        slide_num += 1;
    }

    // Truncate if needed (char-safe for multi-byte UTF-8)
    if content.chars().count() > max_chars {
        content = content.chars().take(max_chars).collect::<String>();
    }

    Ok(content)
}

/// Extract slide number from filename (e.g., "ppt/slides/slide5.xml" -> 5)
fn extract_slide_number(name: &str) -> u32 {
    name.trim_start_matches("ppt/slides/slide")
        .trim_end_matches(".xml")
        .parse()
        .unwrap_or(0)
}

/// Extract text from a single slide's XML content
fn extract_text_from_slide_xml(xml_content: &str) -> String {
    let mut reader = Reader::from_str(xml_content);
    reader.config_mut().trim_text(true);

    let mut content = String::new();
    let mut in_text_element = false;
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) | Ok(Event::Empty(e)) => {
                let name = e.name();
                let local_name = String::from_utf8_lossy(name.as_ref());

                // PowerPoint uses <a:t> for text elements
                if local_name == "a:t" {
                    in_text_element = true;
                }
            }
            Ok(Event::End(e)) => {
                let name = e.name();
                let local_name = String::from_utf8_lossy(name.as_ref());

                if local_name == "a:t" {
                    in_text_element = false;
                }
                // Add line break after paragraphs
                if local_name == "a:p" && !content.is_empty() && !content.ends_with('\n') {
                    content.push('\n');
                }
            }
            Ok(Event::Text(e)) => {
                if in_text_element {
                    let text = e.unescape().unwrap_or_default();
                    content.push_str(&text);
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }

    // Clean up whitespace
    content
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    // Tests would require actual .pptx files
}
