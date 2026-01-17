use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Represents a discovered file with its metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedFile {
    pub path: PathBuf,
    pub filename: String,
    pub extension: Option<String>,
    pub size: u64,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub content_hash: Option<String>,
}

/// Scan configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanConfig {
    pub directories: Vec<PathBuf>,
    pub include_hidden: bool,
    pub max_depth: Option<usize>,
    pub compute_hashes: bool,
    pub extensions_filter: Option<Vec<String>>,
}

impl Default for ScanConfig {
    fn default() -> Self {
        Self {
            directories: vec![],
            include_hidden: false,
            max_depth: Some(10),
            compute_hashes: false,
            extensions_filter: None,
        }
    }
}

/// Scan directories and collect file metadata
pub fn scan_directories(config: &ScanConfig) -> Vec<ScannedFile> {
    let mut files = Vec::new();

    for dir in &config.directories {
        if !dir.exists() {
            continue;
        }

        let walker = WalkDir::new(dir)
            .max_depth(config.max_depth.unwrap_or(usize::MAX))
            .follow_links(false);

        for entry in walker.into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();

            // Skip directories
            if path.is_dir() {
                continue;
            }

            // Skip files in "Organized Files" folders - these are already organized
            let path_str = path.to_string_lossy().to_lowercase();
            if path_str.contains("organized files") {
                continue;
            }

            // Skip hidden files unless configured
            if !config.include_hidden {
                if let Some(name) = path.file_name() {
                    if name.to_string_lossy().starts_with('.') {
                        continue;
                    }
                }
            }

            // Filter by extension if configured
            if let Some(ref allowed) = config.extensions_filter {
                let ext = path
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase());
                if let Some(ref ext) = ext {
                    if !allowed.iter().any(|a| a.to_lowercase() == *ext) {
                        continue;
                    }
                } else {
                    continue; // Skip files without extensions
                }
            }

            if let Some(scanned) = scan_file(path, config.compute_hashes) {
                files.push(scanned);
            }
        }
    }

    files
}

/// Scan a single file and extract metadata
fn scan_file(path: &Path, compute_hash: bool) -> Option<ScannedFile> {
    let metadata = fs::metadata(path).ok()?;

    let filename = path.file_name()?.to_string_lossy().to_string();

    let extension = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase());

    let created_at = metadata
        .created()
        .ok()
        .and_then(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339().into());

    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339().into());

    let content_hash = if compute_hash {
        compute_file_hash(path)
    } else {
        None
    };

    Some(ScannedFile {
        path: path.to_path_buf(),
        filename,
        extension,
        size: metadata.len(),
        created_at,
        modified_at,
        content_hash,
    })
}

/// Compute SHA-256 hash of file contents (first 1MB only for speed)
fn compute_file_hash(path: &Path) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 1024 * 1024]; // 1MB buffer

    let bytes_read = file.read(&mut buffer).ok()?;
    hasher.update(&buffer[..bytes_read]);

    Some(hex::encode(hasher.finalize()))
}

/// Extract text snippet from a file for AI classification
#[allow(dead_code)]
pub fn extract_snippet(path: &Path, max_chars: usize) -> Option<String> {
    let extension = path.extension()?.to_string_lossy().to_lowercase();

    match extension.as_str() {
        "txt" | "md" | "json" | "xml" | "csv" | "log" => {
            extract_text_snippet(path, max_chars)
        }
        // PDF extraction would require additional dependencies
        // For now, return filename-based info
        "pdf" => Some(format!(
            "[PDF Document] Filename: {}",
            path.file_name()?.to_string_lossy()
        )),
        // Office documents would need additional parsing
        "docx" | "xlsx" | "pptx" => Some(format!(
            "[Office Document] Filename: {}",
            path.file_name()?.to_string_lossy()
        )),
        // Images - return metadata only
        "jpg" | "jpeg" | "png" | "gif" | "webp" => Some(format!(
            "[Image] Filename: {}",
            path.file_name()?.to_string_lossy()
        )),
        _ => None,
    }
}

/// Extract text from plain text files
#[allow(dead_code)]
fn extract_text_snippet(path: &Path, max_chars: usize) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut buffer = vec![0u8; max_chars];
    let bytes_read = file.read(&mut buffer).ok()?;

    String::from_utf8(buffer[..bytes_read].to_vec()).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_scan_config_default() {
        let config = ScanConfig::default();
        assert!(!config.include_hidden);
        assert_eq!(config.max_depth, Some(10));
    }
}
