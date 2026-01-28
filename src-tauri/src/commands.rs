use crate::activity_log::{self, Operation, OperationType, OperationStatus, SessionStatus};
use crate::ai::{
    AIClient, AIConfig, FileForClassification, estimate_credits,
    PersonalizationAnswers as AIPersonalizationAnswers,
    FileSummary as AIFileSummary,
    CategoryStats as AICategoryStats,
    ClarificationQuestion as AIClarificationQuestion,
};
use crate::db::DbPath;
use crate::scanner::{self, ScanConfig, ScannedFile};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

/// Free tier limit - maximum number of scans allowed
const FREE_TIER_MAX_SCANS: u32 = 10;

/// Known folder information
#[derive(Debug, Clone, Serialize)]
pub struct KnownFolder {
    pub id: String,
    pub name: String,
    pub path: String,
}

/// App settings stored in config file
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub anthropic_api_key: Option<String>,
    pub anthropic_model: Option<String>,
    #[serde(default)]
    pub scans_used: u32,
}

/// Get the settings file path
fn get_settings_path(app: &AppHandle) -> PathBuf {
    let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
    app_data_dir.join("settings.json")
}

/// Load app settings from config file
#[tauri::command]
pub fn get_settings(app: AppHandle) -> AppSettings {
    let settings_path = get_settings_path(&app);

    if settings_path.exists() {
        if let Ok(contents) = fs::read_to_string(&settings_path) {
            if let Ok(settings) = serde_json::from_str(&contents) {
                return settings;
            }
        }
    }

    AppSettings::default()
}

/// Save app settings to config file (atomic write to prevent corruption)
#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let settings_path = get_settings_path(&app);

    // Ensure directory exists
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;

    // Atomic write: write to temp file, then rename (prevents corruption on crash/race)
    let temp_path = settings_path.with_extension("tmp");
    fs::write(&temp_path, &json).map_err(|e| e.to_string())?;
    fs::rename(&temp_path, &settings_path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Internal: Get current scan count without tauri command wrapper
fn get_scan_count_internal(app: &AppHandle) -> u32 {
    let settings = get_settings(app.clone());
    settings.scans_used
}

/// Internal: Increment scan count without tauri command wrapper
fn increment_scan_count_internal(app: &AppHandle) -> Result<u32, String> {
    let mut settings = get_settings(app.clone());
    settings.scans_used += 1;
    save_settings(app.clone(), settings.clone())?;
    Ok(settings.scans_used)
}

/// Increment scan count (called after successful scan)
#[tauri::command]
pub fn increment_scan_count(app: AppHandle) -> Result<u32, String> {
    increment_scan_count_internal(&app)
}

/// Get current scan count
#[tauri::command]
pub fn get_scan_count(app: AppHandle) -> u32 {
    get_scan_count_internal(&app)
}

/// Test the API connection with the provided key
#[tauri::command]
pub async fn test_api_connection(api_key: String, model: Option<String>) -> Result<bool, String> {
    let config = AIConfig {
        api_key,
        model: model.unwrap_or_else(|| "claude-haiku-4-5-20251001".to_string()),
        base_url: "https://api.anthropic.com/v1".to_string(),
    };

    let client = AIClient::new(config);

    // Try a minimal API call to verify the key works
    match client.test_connection().await {
        Ok(_) => Ok(true),
        Err(e) => Err(e),
    }
}

/// Quick file count result
#[derive(Debug, Clone, Serialize)]
pub struct QuickFileCount {
    pub total_files: usize,
    pub estimated_credits: f64,
}

/// Quickly count files in directories (without full scanning)
/// If extensions is provided, only count files with those extensions
#[tauri::command]
pub fn count_files_in_directories(
    directories: Vec<String>,
    extensions: Option<Vec<String>>,
) -> QuickFileCount {
    let mut total = 0;

    // Convert extensions to lowercase HashSet for fast lookup
    let ext_filter: Option<std::collections::HashSet<String>> = extensions.map(|exts| {
        exts.into_iter().map(|e| e.to_lowercase()).collect()
    });

    for dir in directories {
        let path = std::path::Path::new(&dir);
        if path.exists() && path.is_dir() {
            // Use walkdir to count files quickly
            for entry in walkdir::WalkDir::new(path)
                .max_depth(10)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                // Skip files in "Organized Files" folders - these are already organized
                let entry_path = entry.path().to_string_lossy();
                if entry_path.contains("Organized Files") {
                    continue;
                }

                if entry.file_type().is_file() {
                    // Skip hidden files
                    if let Some(name) = entry.file_name().to_str() {
                        if name.starts_with('.') {
                            continue;
                        }

                        // Check extension filter if provided
                        if let Some(ref filter) = ext_filter {
                            let file_ext = entry.path()
                                .extension()
                                .and_then(|e| e.to_str())
                                .map(|e| e.to_lowercase())
                                .unwrap_or_default();

                            if !filter.contains(&file_ext) {
                                continue;
                            }
                        }

                        total += 1;
                    }
                }
            }
        }
    }

    QuickFileCount {
        total_files: total,
        estimated_credits: estimate_credits(total),
    }
}

/// Get Windows known folder paths (Desktop, Documents, Downloads)
#[tauri::command]
pub fn get_known_folders() -> Vec<KnownFolder> {
    let mut folders = Vec::new();

    if let Some(desktop) = dirs::desktop_dir() {
        folders.push(KnownFolder {
            id: "desktop".to_string(),
            name: "Desktop".to_string(),
            path: desktop.to_string_lossy().to_string(),
        });
    }

    if let Some(documents) = dirs::document_dir() {
        folders.push(KnownFolder {
            id: "documents".to_string(),
            name: "Documents".to_string(),
            path: documents.to_string_lossy().to_string(),
        });
    }

    if let Some(downloads) = dirs::download_dir() {
        folders.push(KnownFolder {
            id: "downloads".to_string(),
            name: "Downloads".to_string(),
            path: downloads.to_string_lossy().to_string(),
        });
    }

    folders
}

/// Classification progress info
#[derive(Debug, Clone, Serialize)]
pub struct ClassificationProgress {
    pub total_files: usize,
    pub classified: usize,
    pub credits_used: f64,
    pub estimated_credits: f64,
}

/// Classify files using AI (batch processing)
#[tauri::command]
pub async fn classify_files(
    batch_size: Option<usize>,
    db_path: State<'_, DbPath>,
) -> Result<ClassificationProgress, String> {
    let batch_size = batch_size.unwrap_or(20);
    let db_path_clone = db_path.0.clone();

    // Load API key from environment variable (developer's key for freemium)
    let config = AIConfig::from_env()?;
    let client = AIClient::new(config);

    // Step 1: Get files from database (sync block, then drop connection)
    let (files, total, classified) = {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        // Get files that haven't been classified yet
        let mut stmt = conn
            .prepare(
                "SELECT f.id, f.filename, f.extension, f.size, f.created_at, f.modified_at, cs.snippet
                 FROM files f
                 LEFT JOIN content_snippets cs ON f.id = cs.file_id
                 LEFT JOIN ai_metadata m ON f.id = m.file_id
                 WHERE m.file_id IS NULL
                 LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;

        let files: Vec<FileForClassification> = stmt
            .query_map([batch_size as i64], |row| {
                Ok(FileForClassification {
                    id: row.get(0)?,
                    filename: row.get(1)?,
                    extension: row.get(2)?,
                    size: row.get(3)?,
                    created_at: row.get(4)?,
                    modified_at: row.get(5)?,
                    snippet: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        let total: usize = conn
            .query_row("SELECT COUNT(*) FROM files", [], |row| row.get(0))
            .unwrap_or(0);
        let classified: usize = conn
            .query_row("SELECT COUNT(*) FROM ai_metadata", [], |row| row.get(0))
            .unwrap_or(0);

        (files, total, classified)
        // conn is dropped here
    };

    if files.is_empty() {
        return Ok(ClassificationProgress {
            total_files: total,
            classified,
            credits_used: 0.0,
            estimated_credits: 0.0,
        });
    }

    // Step 2: Classify the batch (async, no db connection held)
    let result = client.classify_files(files).await?;

    // Step 3: Store results in database (new connection)
    let (final_total, final_classified) = {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        for classification in &result.classifications {
            conn.execute(
                "INSERT OR REPLACE INTO ai_metadata (file_id, category, subcategory, tags, summary, confidence, suggested_path, classified_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)",
                (
                    classification.file_id,
                    classification.category.as_str(),
                    &classification.subcategory,
                    classification.tags.join(", "),
                    &classification.summary,
                    classification.confidence,
                    &classification.suggested_folder,
                ),
            )
            .map_err(|e| e.to_string())?;
        }

        // Get updated stats
        let total: usize = conn
            .query_row("SELECT COUNT(*) FROM files", [], |row| row.get(0))
            .unwrap_or(0);
        let classified: usize = conn
            .query_row("SELECT COUNT(*) FROM ai_metadata", [], |row| row.get(0))
            .unwrap_or(0);

        (total, classified)
    };

    let pending = final_total.saturating_sub(final_classified);

    Ok(ClassificationProgress {
        total_files: final_total,
        classified: final_classified,
        credits_used: result.credits_used,
        estimated_credits: estimate_credits(pending),
    })
}

/// Get estimated credits for classifying remaining files
#[tauri::command]
pub async fn get_classification_estimate(
    db_path: State<'_, DbPath>,
) -> Result<ClassificationProgress, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let total: usize = conn
        .query_row("SELECT COUNT(*) FROM files", [], |row| row.get(0))
        .unwrap_or(0);
    let classified: usize = conn
        .query_row("SELECT COUNT(*) FROM ai_metadata", [], |row| row.get(0))
        .unwrap_or(0);
    let pending = total.saturating_sub(classified);

    Ok(ClassificationProgress {
        total_files: total,
        classified,
        credits_used: 0.0,
        estimated_credits: estimate_credits(pending),
    })
}

/// Check if AI is configured (API key available)
#[tauri::command]
pub fn check_ai_config() -> Result<bool, String> {
    match AIConfig::from_env() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Scan status response
#[derive(Debug, Clone, Serialize)]
pub struct ScanStatus {
    pub total_files: usize,
    pub classified_files: usize,
    pub pending_classification: usize,
    pub last_scan_at: Option<String>,
}

/// Search result item
#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    pub id: i64,
    pub path: String,
    pub filename: String,
    pub category: Option<String>,
    pub tags: Option<String>,
    pub summary: Option<String>,
    pub previous_path: Option<String>,
    pub confidence: Option<f64>,
}

/// File details response
#[derive(Debug, Clone, Serialize)]
pub struct FileDetails {
    pub id: i64,
    pub path: String,
    pub filename: String,
    pub extension: Option<String>,
    pub size: i64,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub category: Option<String>,
    pub subcategory: Option<String>,
    pub tags: Option<String>,
    pub summary: Option<String>,
    pub move_history: Vec<MoveRecord>,
}

/// Move history record
#[derive(Debug, Clone, Serialize)]
pub struct MoveRecord {
    pub source_path: String,
    pub destination_path: String,
    pub moved_at: String,
}

/// Organization plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationPlan {
    pub id: String,
    pub name: String,
    pub style: OrganizationStyle,
    pub items: Vec<PlanItem>,
    pub summary: PlanSummary,
}

/// Organization style options (per 03-taxonomy-and-vocabulary.md)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrganizationStyle {
    Simple,      // Work, Money, Home, Health, Archive, Review
    Timeline,    // By year (2025, 2024, 2023, Older, Review)
    SmartGroups, // Clients, Projects, Money, Archive, Review
}

/// Individual item in an organization plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanItem {
    pub file_id: i64,
    pub source_path: String,
    pub destination_path: String,
    pub confidence: f64,
    pub reason: String,
    pub requires_review: bool,
}

/// Summary statistics for a plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanSummary {
    pub total_files: usize,
    pub high_confidence: usize,
    pub low_confidence: usize,
    pub duplicates_found: usize,
    pub folders_to_create: Vec<String>,
}

/// Result of incremental scan operation
#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub new_files: usize,
    pub updated_files: usize,
    pub unchanged_files: usize,
    pub deleted_files: usize,
    pub total_files: usize,
    pub files: Vec<ScannedFile>,
}

/// Check if a file needs to be rescanned (different hash or modified date)
fn file_needs_rescan(
    conn: &Connection,
    path: &str,
    new_hash: &Option<String>,
    new_modified: &Option<String>,
) -> Result<bool, rusqlite::Error> {
    match conn.query_row(
        "SELECT content_hash, modified_at FROM files WHERE path = ?1",
        [path],
        |row| {
            Ok((
                row.get::<_, Option<String>>(0)?,
                row.get::<_, Option<String>>(1)?,
            ))
        },
    ) {
        Ok((old_hash, old_modified)) => {
            // File exists - check if it changed
            Ok(new_hash != &old_hash || new_modified != &old_modified)
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(true), // New file
        Err(e) => Err(e),
    }
}

/// Scan specified directories and index files (incremental - preserves AI metadata for unchanged files)
/// If extensions is provided, only scan files with those extensions
/// Enforces free tier scan limit on the backend (cannot be bypassed via devtools)
#[tauri::command]
pub async fn scan_directories(
    directories: Vec<String>,
    extensions: Option<Vec<String>>,
    app: AppHandle,
    db_path: State<'_, DbPath>,
) -> Result<ScanResult, String> {
    // Backend free tier enforcement - check scan count BEFORE scanning
    let current_scans = get_scan_count_internal(&app);
    if current_scans >= FREE_TIER_MAX_SCANS {
        return Err(format!(
            "Free tier limit reached ({}/{} scans used). Upgrade to continue organizing files.",
            current_scans, FREE_TIER_MAX_SCANS
        ));
    }

    let config = ScanConfig {
        directories: directories.iter().map(|d| PathBuf::from(d)).collect(),
        include_hidden: false,
        max_depth: Some(10),
        compute_hashes: true,
        extensions_filter: extensions,
    };

    let files = scanner::scan_directories(&config);

    // Store in database incrementally (preserve AI metadata for unchanged files)
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    // Track which paths we see in this scan (lowercase for case-insensitive comparison on Windows)
    let mut seen_paths = std::collections::HashSet::new();
    let mut new_files = 0;
    let mut updated_files = 0;
    let mut unchanged_files = 0;

    for file in &files {
        let path_str = file.path.to_string_lossy().to_string();
        // Use lowercase for case-insensitive path tracking on Windows
        seen_paths.insert(path_str.to_lowercase());

        let needs_update = file_needs_rescan(&conn, &path_str, &file.content_hash, &file.modified_at)
            .map_err(|e| e.to_string())?;

        if needs_update {
            // Check if this is a new file or update
            let is_new: bool = conn
                .query_row(
                    "SELECT 1 FROM files WHERE path = ?1",
                    [&path_str],
                    |_| Ok(false),
                )
                .unwrap_or(true);

            // Upsert file record
            conn.execute(
                "INSERT INTO files (path, filename, extension, size, created_at, modified_at, content_hash, last_scanned_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
                 ON CONFLICT(path) DO UPDATE SET
                     filename = excluded.filename,
                     extension = excluded.extension,
                     size = excluded.size,
                     created_at = excluded.created_at,
                     modified_at = excluded.modified_at,
                     content_hash = excluded.content_hash,
                     last_scanned_at = CURRENT_TIMESTAMP",
                rusqlite::params![
                    &path_str,
                    &file.filename,
                    &file.extension,
                    file.size as i64,
                    &file.created_at,
                    &file.modified_at,
                    &file.content_hash,
                ],
            )
            .map_err(|e| e.to_string())?;

            // Clear stale AI metadata for changed files only (not new files)
            if !is_new {
                // Get file_id to clear related data
                if let Ok(file_id) = conn.query_row(
                    "SELECT id FROM files WHERE path = ?1",
                    [&path_str],
                    |row| row.get::<_, i64>(0),
                ) {
                    conn.execute(
                        "DELETE FROM ai_metadata WHERE file_id = ?1",
                        [file_id],
                    )
                    .ok();
                    conn.execute(
                        "DELETE FROM content_snippets WHERE file_id = ?1",
                        [file_id],
                    )
                    .ok();
                }
                updated_files += 1;
            } else {
                new_files += 1;
            }
        } else {
            // File unchanged - just update last_scanned_at timestamp
            conn.execute(
                "UPDATE files SET last_scanned_at = CURRENT_TIMESTAMP WHERE path = ?1",
                [&path_str],
            )
            .ok();
            unchanged_files += 1;
        }
    }

    // Remove files that no longer exist in the scanned directories
    // Only delete files that are within the scanned directories and weren't seen
    let mut deleted_files = 0;
    for dir in &directories {
        // Find files in this directory that weren't seen in this scan
        // Ensure we match full directory path (add separator to prevent matching C:\Downloads2 when scanning C:\Downloads)
        let dir_with_sep = if dir.ends_with('\\') || dir.ends_with('/') {
            dir.clone()
        } else {
            format!("{}\\", dir)
        };
        let dir_pattern = format!("{}%", dir_with_sep.replace('\\', "\\\\"));
        let stale_file_ids: Vec<i64> = {
            let mut stmt = conn
                .prepare(
                    "SELECT id, path FROM files WHERE path LIKE ?1 COLLATE NOCASE",
                )
                .map_err(|e| e.to_string())?;

            let rows = stmt
                .query_map([&dir_pattern], |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
                })
                .map_err(|e| e.to_string())?;

            rows.filter_map(|r| r.ok())
                .filter(|(_, path)| !seen_paths.contains(&path.to_lowercase()))
                .map(|(id, _)| id)
                .collect()
        };

        for file_id in stale_file_ids {
            // Delete associated data first (foreign key order)
            conn.execute("DELETE FROM ai_metadata WHERE file_id = ?1", [file_id]).ok();
            conn.execute("DELETE FROM content_snippets WHERE file_id = ?1", [file_id]).ok();
            conn.execute("DELETE FROM plan_items WHERE file_id = ?1", [file_id]).ok();
            conn.execute("DELETE FROM move_history WHERE file_id = ?1", [file_id]).ok();
            conn.execute("DELETE FROM files WHERE id = ?1", [file_id]).ok();
            deleted_files += 1;
        }
    }

    let total_files = new_files + updated_files + unchanged_files;

    // Backend free tier enforcement - increment scan count AFTER successful scan
    // This ensures the count only increases for successful scans
    if total_files > 0 {
        increment_scan_count_internal(&app)?;
    }

    Ok(ScanResult {
        new_files,
        updated_files,
        unchanged_files,
        deleted_files,
        total_files,
        files,
    })
}

/// Get current scan status
#[tauri::command]
pub async fn get_scan_status(db_path: State<'_, DbPath>) -> Result<ScanStatus, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let total_files: usize = conn
        .query_row("SELECT COUNT(*) FROM files", [], |row| row.get(0))
        .unwrap_or(0);

    let classified_files: usize = conn
        .query_row("SELECT COUNT(*) FROM ai_metadata", [], |row| row.get(0))
        .unwrap_or(0);

    let last_scan_at: Option<String> = conn
        .query_row(
            "SELECT MAX(last_scanned_at) FROM files",
            [],
            |row| row.get(0),
        )
        .ok();

    Ok(ScanStatus {
        total_files,
        classified_files,
        pending_classification: total_files.saturating_sub(classified_files),
        last_scan_at,
    })
}

/// Search files using natural language query
#[tauri::command]
pub async fn search_files(
    query: String,
    db_path: State<'_, DbPath>,
) -> Result<Vec<SearchResult>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    // Use FTS5 for search, fallback to LIKE if no results
    let mut stmt = conn
        .prepare(
            "SELECT f.id, f.path, f.filename, m.category, m.tags, m.summary, m.confidence
             FROM files f
             LEFT JOIN ai_metadata m ON f.id = m.file_id
             WHERE f.filename LIKE ?1 OR m.tags LIKE ?1 OR m.summary LIKE ?1
             LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let search_pattern = format!("%{}%", query);

    let results = stmt
        .query_map([&search_pattern], |row| {
            Ok(SearchResult {
                id: row.get(0)?,
                path: row.get(1)?,
                filename: row.get(2)?,
                category: row.get(3)?,
                tags: row.get(4)?,
                summary: row.get(5)?,
                previous_path: None, // Note: Could be populated from operations table if needed
                confidence: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    results.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Get detailed information about a specific file
#[tauri::command]
pub async fn get_file_details(
    file_id: i64,
    db_path: State<'_, DbPath>,
) -> Result<FileDetails, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let details = conn
        .query_row(
            "SELECT f.id, f.path, f.filename, f.extension, f.size, f.created_at, f.modified_at,
                    m.category, m.subcategory, m.tags, m.summary
             FROM files f
             LEFT JOIN ai_metadata m ON f.id = m.file_id
             WHERE f.id = ?1",
            [file_id],
            |row| {
                Ok(FileDetails {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    filename: row.get(2)?,
                    extension: row.get(3)?,
                    size: row.get(4)?,
                    created_at: row.get(5)?,
                    modified_at: row.get(6)?,
                    category: row.get(7)?,
                    subcategory: row.get(8)?,
                    tags: row.get(9)?,
                    summary: row.get(10)?,
                    move_history: vec![],
                })
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(details)
}

/// Count duplicate files (same filename + extension in different locations)
#[tauri::command]
pub fn count_duplicates(db_path: State<'_, DbPath>) -> Result<usize, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM (
            SELECT filename, extension, COUNT(*) as cnt
            FROM files
            GROUP BY LOWER(filename), LOWER(COALESCE(extension, ''))
            HAVING cnt > 1
        )",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(count as usize)
}

/// Smart categorization based on filename patterns
/// Returns (category, subcategory) based on keywords in the filename
fn categorize_by_filename(name_lower: &str) -> Option<(String, Option<String>)> {
    // Financial documents
    if name_lower.contains("invoice") || name_lower.contains("receipt") || name_lower.contains("bill") ||
       name_lower.contains("payment") || name_lower.contains("orden") || name_lower.contains("factura") {
        return Some(("Finances".to_string(), Some("Receipts & Invoices".to_string())));
    }
    if name_lower.contains("tax") || name_lower.contains("w2") || name_lower.contains("1099") ||
       name_lower.contains("w-2") || name_lower.contains("1040") || name_lower.contains("impuesto") {
        return Some(("Finances".to_string(), Some("Tax Documents".to_string())));
    }
    if name_lower.contains("bank") || name_lower.contains("statement") || name_lower.contains("account") {
        return Some(("Finances".to_string(), Some("Bank Statements".to_string())));
    }
    if name_lower.contains("budget") || name_lower.contains("expense") || name_lower.contains("spending") {
        return Some(("Finances".to_string(), Some("Budgets".to_string())));
    }

    // Legal documents
    if name_lower.contains("contract") || name_lower.contains("agreement") || name_lower.contains("contrato") {
        return Some(("Legal".to_string(), Some("Contracts".to_string())));
    }
    if name_lower.contains("lease") || name_lower.contains("rental") || name_lower.contains("tenant") {
        return Some(("Legal".to_string(), Some("Leases".to_string())));
    }
    if name_lower.contains("warranty") || name_lower.contains("guarantee") {
        return Some(("Legal".to_string(), Some("Warranties".to_string())));
    }
    if name_lower.contains("license") || name_lower.contains("permit") || name_lower.contains("licencia") {
        return Some(("Legal".to_string(), Some("Licenses & Permits".to_string())));
    }

    // Medical/Health
    if name_lower.contains("medical") || name_lower.contains("health") || name_lower.contains("doctor") ||
       name_lower.contains("hospital") || name_lower.contains("clinic") || name_lower.contains("medico") {
        return Some(("Medical".to_string(), Some("Records".to_string())));
    }
    if name_lower.contains("prescription") || name_lower.contains("rx") || name_lower.contains("medication") ||
       name_lower.contains("receta") {
        return Some(("Medical".to_string(), Some("Prescriptions".to_string())));
    }
    if name_lower.contains("insurance") && (name_lower.contains("health") || name_lower.contains("medical")) {
        return Some(("Medical".to_string(), Some("Insurance".to_string())));
    }
    if name_lower.contains("lab") || name_lower.contains("test result") || name_lower.contains("blood") {
        return Some(("Medical".to_string(), Some("Lab Results".to_string())));
    }

    // Work/Career
    if name_lower.contains("resume") || name_lower.contains("cv") || name_lower.contains("curriculum") {
        return Some(("Work".to_string(), Some("Career".to_string())));
    }
    if name_lower.contains("offer letter") || name_lower.contains("employment") || name_lower.contains("job offer") {
        return Some(("Work".to_string(), Some("Employment".to_string())));
    }
    if name_lower.contains("payslip") || name_lower.contains("paystub") || name_lower.contains("salary") ||
       name_lower.contains("nomina") {
        return Some(("Work".to_string(), Some("Pay Stubs".to_string())));
    }
    if name_lower.contains("performance") || name_lower.contains("review") || name_lower.contains("evaluation") {
        return Some(("Work".to_string(), Some("Reviews".to_string())));
    }
    if name_lower.contains("training") || name_lower.contains("certificate") || name_lower.contains("certification") ||
       name_lower.contains("diploma") || name_lower.contains("certificado") {
        return Some(("Work".to_string(), Some("Certifications".to_string())));
    }

    // Education
    if name_lower.contains("transcript") || name_lower.contains("grades") || name_lower.contains("gpa") {
        return Some(("Education".to_string(), Some("Transcripts".to_string())));
    }
    if name_lower.contains("homework") || name_lower.contains("assignment") || name_lower.contains("tarea") {
        return Some(("Education".to_string(), Some("Assignments".to_string())));
    }
    if name_lower.contains("syllabus") || name_lower.contains("course") || name_lower.contains("class") {
        return Some(("Education".to_string(), Some("Courses".to_string())));
    }

    // Insurance
    if name_lower.contains("insurance") || name_lower.contains("policy") || name_lower.contains("coverage") ||
       name_lower.contains("seguro") {
        return Some(("Insurance".to_string(), Some("Policies".to_string())));
    }
    if name_lower.contains("claim") {
        return Some(("Insurance".to_string(), Some("Claims".to_string())));
    }

    // Travel
    if name_lower.contains("passport") || name_lower.contains("visa") || name_lower.contains("pasaporte") {
        return Some(("Travel".to_string(), Some("ID Documents".to_string())));
    }
    if name_lower.contains("ticket") || name_lower.contains("boarding") || name_lower.contains("flight") ||
       name_lower.contains("itinerary") || name_lower.contains("boleto") {
        return Some(("Travel".to_string(), Some("Bookings".to_string())));
    }
    if name_lower.contains("hotel") || name_lower.contains("reservation") || name_lower.contains("booking") {
        return Some(("Travel".to_string(), Some("Reservations".to_string())));
    }

    // Home/Property
    if name_lower.contains("mortgage") || name_lower.contains("deed") || name_lower.contains("title") ||
       name_lower.contains("hipoteca") {
        return Some(("Home".to_string(), Some("Property".to_string())));
    }
    if name_lower.contains("utility") || name_lower.contains("electric") || name_lower.contains("water") ||
       name_lower.contains("gas bill") || name_lower.contains("internet") {
        return Some(("Home".to_string(), Some("Utilities".to_string())));
    }
    if name_lower.contains("appliance") || name_lower.contains("repair") || name_lower.contains("maintenance") {
        return Some(("Home".to_string(), Some("Maintenance".to_string())));
    }

    // Vehicle/Auto
    if name_lower.contains("car") || name_lower.contains("vehicle") || name_lower.contains("auto") ||
       name_lower.contains("dmv") || name_lower.contains("registration") || name_lower.contains("vehiculo") {
        return Some(("Vehicle".to_string(), Some("Registration".to_string())));
    }

    // Reference materials
    if name_lower.contains("manual") || name_lower.contains("guide") || name_lower.contains("instructions") ||
       name_lower.contains("how to") || name_lower.contains("tutorial") {
        return Some(("Reference".to_string(), Some("Manuals".to_string())));
    }
    if name_lower.contains("recipe") || name_lower.contains("receta") {
        return Some(("Reference".to_string(), Some("Recipes".to_string())));
    }

    // Personal
    if name_lower.contains("letter") || name_lower.contains("carta") {
        return Some(("Personal".to_string(), Some("Correspondence".to_string())));
    }
    if name_lower.contains("photo") || name_lower.contains("picture") || name_lower.contains("foto") {
        return Some(("Personal".to_string(), Some("Photos".to_string())));
    }

    None
}

/// Get category and subcategory based on file extension (fallback when no AI classification)
fn categorize_by_extension(extension: Option<&str>, filename: &str) -> (String, Option<String>) {
    let ext = extension.map(|e| e.to_lowercase()).unwrap_or_default();
    let name_lower = filename.to_lowercase();

    // First, try smart filename-based categorization (works for any file type)
    if let Some(result) = categorize_by_filename(&name_lower) {
        return result;
    }

    // Fall back to extension-based categorization
    match ext.as_str() {
        // Documents - PDFs often need more context
        "pdf" => ("Documents".to_string(), Some("PDFs".to_string())),
        "doc" | "docx" => ("Documents".to_string(), Some("Word Documents".to_string())),
        "xls" | "xlsx" | "csv" => ("Documents".to_string(), Some("Spreadsheets".to_string())),
        "ppt" | "pptx" => ("Documents".to_string(), Some("Presentations".to_string())),
        "txt" | "rtf" => ("Documents".to_string(), Some("Text Files".to_string())),

        // Images
        "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "heic" => {
            let name_lower = filename.to_lowercase();
            if name_lower.contains("screenshot") {
                ("Images".to_string(), Some("Screenshots".to_string()))
            } else if name_lower.contains("scan") {
                ("Documents".to_string(), Some("Scanned".to_string()))
            } else {
                ("Images".to_string(), Some("Photos".to_string()))
            }
        }
        "svg" | "ai" | "eps" => ("Images".to_string(), Some("Graphics".to_string())),
        "psd" => ("Images".to_string(), Some("Photoshop".to_string())),
        "raw" | "cr2" | "nef" | "arw" => ("Images".to_string(), Some("RAW Photos".to_string())),

        // Audio
        "mp3" | "wav" | "flac" | "aac" | "m4a" | "ogg" | "wma" => ("Media".to_string(), Some("Audio".to_string())),

        // Video
        "mp4" | "avi" | "mkv" | "mov" | "wmv" | "flv" | "webm" => ("Media".to_string(), Some("Video".to_string())),

        // Archives
        "zip" | "rar" | "7z" | "tar" | "gz" => ("Archives".to_string(), None),

        // Code/Development
        "js" | "ts" | "jsx" | "tsx" | "py" | "java" | "cpp" | "c" | "h" | "rs" | "go" | "rb" | "php" | "swift" | "kt" =>
            ("Development".to_string(), Some("Source Code".to_string())),
        "html" | "css" | "scss" | "sass" | "less" => ("Development".to_string(), Some("Web".to_string())),
        "json" | "xml" | "yaml" | "yml" | "toml" => ("Development".to_string(), Some("Config".to_string())),
        "sql" => ("Development".to_string(), Some("Database".to_string())),
        "md" | "markdown" => ("Development".to_string(), Some("Documentation".to_string())),

        // Executables/Installers
        "exe" | "msi" | "dmg" | "app" => ("Software".to_string(), Some("Installers".to_string())),
        "dll" | "sys" | "so" => ("Software".to_string(), Some("System".to_string())),

        // Ebooks
        "epub" | "mobi" | "azw" | "azw3" => ("Books".to_string(), Some("Ebooks".to_string())),

        // Fonts
        "ttf" | "otf" | "woff" | "woff2" => ("Design".to_string(), Some("Fonts".to_string())),

        // 3D/CAD
        "obj" | "stl" | "fbx" | "blend" => ("Design".to_string(), Some("3D Models".to_string())),
        "dwg" | "dxf" => ("Design".to_string(), Some("CAD".to_string())),

        // Default
        _ => ("Other".to_string(), None),
    }
}

/// Generate an organization plan based on selected style
#[tauri::command]
pub async fn generate_organization_plan(
    style: OrganizationStyle,
    base_path: Option<String>,
    folder_depth: Option<String>,
    db_path: State<'_, DbPath>,
) -> Result<OrganizationPlan, String> {
    let db_path_clone = db_path.0.clone();
    let style_clone = style.clone();

    // Folder depth controls how many levels of subfolders to create:
    // - "flat": Only main category folders (e.g., "01 Work")
    // - "moderate": Category + subcategory (e.g., "01 Work/Resumes")
    // - "detailed": Full AI-suggested paths with projects/clients
    let depth = folder_depth.unwrap_or_else(|| "moderate".to_string());

    // Determine base path for organized files
    let organize_base = base_path.unwrap_or_else(|| {
        dirs::document_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("C:\\"))
            .join("Organized Files")
            .to_string_lossy()
            .to_string()
    });

    // Count duplicates (same filename + extension in different locations)
    let duplicates_found: usize = {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        // Find files with same filename + extension that appear more than once
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM (
                SELECT filename, extension, COUNT(*) as cnt
                FROM files
                GROUP BY LOWER(filename), LOWER(COALESCE(extension, ''))
                HAVING cnt > 1
            )",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        count as usize
    };

    // Query files with classifications
    let files_with_metadata: Vec<(i64, String, String, Option<String>, Option<String>, Option<String>, Option<String>, f64, Option<String>)> = {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        let mut stmt = conn.prepare(
            "SELECT f.id, f.path, f.filename, f.extension, f.modified_at,
                    a.category, a.subcategory, COALESCE(a.confidence, 0.5), a.suggested_path
             FROM files f
             LEFT JOIN ai_metadata a ON f.id = a.file_id
             ORDER BY a.confidence DESC NULLS LAST"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, f64>(7)?,
                row.get::<_, Option<String>>(8)?,
            ))
        }).map_err(|e| e.to_string())?;

        rows.filter_map(|r| r.ok()).collect()
    };

    let plan_id = uuid::Uuid::new_v4().to_string();
    let mut items = Vec::new();
    let mut folders_to_create = std::collections::HashSet::new();
    let mut high_confidence = 0;
    let mut low_confidence = 0;
    let mut skipped_organized = 0;

    for (file_id, source_path, filename, extension, modified_at, category, subcategory, confidence, suggested_path) in files_with_metadata {
        // Skip files that are already in an "Organized Files" folder
        // This prevents re-organizing already organized files on subsequent runs
        if source_path.to_lowercase().contains("organized files") {
            skipped_organized += 1;
            continue;
        }

        // If no AI classification, use rule-based categorization
        let (effective_category, effective_subcategory) = if category.is_some() {
            (category.clone().unwrap(), subcategory.clone())
        } else {
            categorize_by_extension(extension.as_deref(), &filename)
        };

        // Generate destination path based on style AND folder_depth
        let dest_folder = match &style_clone {
            OrganizationStyle::Simple => {
                // Apply folder_depth setting:
                // - "flat": Only main category
                // - "moderate"/"detailed": Category + subcategory
                if depth == "flat" {
                    effective_category.clone()
                } else if let Some(subcat) = &effective_subcategory {
                    format!("{}/{}", effective_category, subcat)
                } else {
                    effective_category.clone()
                }
            }
            OrganizationStyle::Timeline => {
                // Use Year > Category > Subcategory structure
                // This keeps files organized by type within each year
                let year = if let Some(date_str) = &modified_at {
                    let parts: Vec<&str> = date_str.split(&['-', 'T', ' '][..]).collect();
                    if !parts.is_empty() && parts[0].len() == 4 {
                        parts[0].to_string()
                    } else {
                        "Older".to_string()
                    }
                } else {
                    "Older".to_string()
                };

                // Apply folder_depth to timeline as well
                if depth == "flat" {
                    format!("{}/{}", year, effective_category)
                } else if let Some(subcat) = &effective_subcategory {
                    format!("{}/{}/{}", year, effective_category, subcat)
                } else {
                    format!("{}/{}", year, effective_category)
                }
            }
            OrganizationStyle::SmartGroups => {
                // For "detailed" depth, use AI suggested path (includes project/client names)
                // For other depths, fall back to category-based structure
                if depth == "detailed" {
                    if let Some(suggested) = &suggested_path {
                        suggested.clone()
                    } else if let Some(subcat) = &effective_subcategory {
                        format!("{}/{}", effective_category, subcat)
                    } else {
                        effective_category.clone()
                    }
                } else if depth == "flat" {
                    effective_category.clone()
                } else {
                    // moderate
                    if let Some(subcat) = &effective_subcategory {
                        format!("{}/{}", effective_category, subcat)
                    } else {
                        effective_category.clone()
                    }
                }
            }
        };

        let dest_path = format!("{}\\{}\\{}", organize_base, dest_folder.replace("/", "\\"), filename);

        // Track folders to create
        let folder_path = format!("{}\\{}", organize_base, dest_folder.replace("/", "\\"));
        folders_to_create.insert(folder_path);

        // Determine if review is needed
        // - Low AI confidence (<0.35) - lowered from 0.6 to reduce "needs review" count
        // - Rule-based classification to "Other" category
        let requires_review = (category.is_some() && confidence < 0.35) ||
            (category.is_none() && effective_category == "Other");

        // Adjust confidence for rule-based classification
        let effective_confidence = if category.is_some() {
            confidence
        } else if effective_category == "Other" {
            0.4 // Low confidence for unknown types
        } else {
            0.75 // Medium-high confidence for recognized file types
        };

        if effective_confidence >= 0.7 {
            high_confidence += 1;
        } else if effective_confidence < 0.5 {
            low_confidence += 1;
        }

        let reason = if category.is_some() {
            // AI classified
            if let Some(subcat) = &effective_subcategory {
                format!("AI classified as {}/{}", effective_category, subcat)
            } else {
                format!("AI classified as {}", effective_category)
            }
        } else {
            // Rule-based classification
            if let Some(subcat) = &effective_subcategory {
                format!("Sorted by type: {}/{}", effective_category, subcat)
            } else {
                format!("Sorted by type: {}", effective_category)
            }
        };

        items.push(PlanItem {
            file_id,
            source_path,
            destination_path: dest_path,
            confidence: effective_confidence,
            reason,
            requires_review,
        });
    }

    let plan_name = match &style_clone {
        OrganizationStyle::Simple => "Simple Folders Organization",
        OrganizationStyle::Timeline => "Timeline Archive",
        OrganizationStyle::SmartGroups => "Smart Groups Organization",
    };

    // Save plan to database
    {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO organization_plans (id, name, organization_style, status) VALUES (?1, ?2, ?3, 'pending')",
            rusqlite::params![&plan_id, plan_name, format!("{:?}", style_clone).to_lowercase()],
        ).map_err(|e| e.to_string())?;

        // Save plan items
        for item in &items {
            conn.execute(
                "INSERT INTO plan_items (plan_id, file_id, source_path, destination_path, confidence, reason, requires_review)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![
                    &plan_id,
                    item.file_id,
                    &item.source_path,
                    &item.destination_path,
                    item.confidence,
                    &item.reason,
                    item.requires_review as i32
                ],
            ).map_err(|e| e.to_string())?;
        }
    }

    let folders_vec: Vec<String> = folders_to_create.into_iter().collect();
    let total_files = items.len();
    let _ = skipped_organized; // Suppress unused warning

    Ok(OrganizationPlan {
        id: plan_id,
        name: plan_name.to_string(),
        style: style_clone,
        items,
        summary: PlanSummary {
            total_files,
            high_confidence,
            low_confidence,
            duplicates_found,
            folders_to_create: folders_vec,
        },
    })
}

/// Result of executing a plan
#[derive(Debug, Clone, Serialize)]
pub struct ExecutionResult {
    pub files_moved: usize,
    pub files_failed: usize,
    pub files_skipped: usize,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Categorize a Windows/IO error into a user-friendly message
fn categorize_io_error(e: &std::io::Error, path: &str) -> String {
    match e.kind() {
        std::io::ErrorKind::PermissionDenied => {
            format!("Permission denied: {} - Try running as administrator or check file permissions", path)
        }
        std::io::ErrorKind::NotFound => {
            format!("File not found: {}", path)
        }
        std::io::ErrorKind::AlreadyExists => {
            format!("File already exists: {}", path)
        }
        _ => {
            // Check for specific Windows error codes in the message
            let err_str = e.to_string().to_lowercase();
            if err_str.contains("being used by another process") || err_str.contains("sharing violation") {
                format!("File in use: {} - Close any programs using this file and try again", path)
            } else if err_str.contains("cloud") || err_str.contains("onedrive") || err_str.contains("placeholder") {
                format!("Cloud file not available offline: {} - Make sure the file is downloaded from OneDrive", path)
            } else if err_str.contains("path") && err_str.contains("long") {
                format!("Path too long: {} - Windows has a 260 character path limit", path)
            } else if err_str.contains("disk") || err_str.contains("space") {
                format!("Disk full or write error: {}", path)
            } else if err_str.contains("read-only") {
                format!("File is read-only: {}", path)
            } else {
                format!("Error with {}: {}", path, e)
            }
        }
    }
}

/// Check if a file is a cloud placeholder (OneDrive, etc.) that needs to be downloaded
fn is_cloud_placeholder(path: &std::path::Path) -> bool {
    // On Windows, cloud placeholders have special attributes
    // We can check file size vs allocated size, or check attributes
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::MetadataExt;
        if let Ok(metadata) = path.metadata() {
            // Cloud placeholders often have FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS (0x400000)
            // or FILE_ATTRIBUTE_OFFLINE (0x1000)
            let attrs = metadata.file_attributes();
            if (attrs & 0x400000) != 0 || (attrs & 0x1000) != 0 {
                return true;
            }
        }
    }
    false
}

/// Generate a unique filename by appending _1, _2, etc.
fn get_unique_path(dest: &std::path::Path) -> Option<std::path::PathBuf> {
    if !dest.exists() {
        return Some(dest.to_path_buf());
    }

    let stem = dest.file_stem()?.to_str()?;
    let ext = dest.extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();
    let parent = dest.parent()?;

    for counter in 1..=100 {
        let new_name = format!("{}_{}{}", stem, counter, ext);
        let new_path = parent.join(&new_name);
        if !new_path.exists() {
            return Some(new_path);
        }
    }
    None
}

/// Safely update file path in database, handling UNIQUE constraint
fn update_file_path_safe(conn: &Connection, file_id: i64, new_path: &str) -> Result<(), String> {
    // First check if another file already has this path
    let existing_id: Option<i64> = conn.query_row(
        "SELECT id FROM files WHERE path = ?1 AND id != ?2",
        rusqlite::params![new_path, file_id],
        |row| row.get(0),
    ).ok();

    if let Some(other_id) = existing_id {
        // Another record has this path - it's likely a stale record
        // Delete the stale record (the file at that path is now this file)
        conn.execute(
            "DELETE FROM ai_metadata WHERE file_id = ?1",
            rusqlite::params![other_id],
        ).ok();
        conn.execute(
            "DELETE FROM content_snippets WHERE file_id = ?1",
            rusqlite::params![other_id],
        ).ok();
        conn.execute(
            "DELETE FROM files WHERE id = ?1",
            rusqlite::params![other_id],
        ).ok();
    }

    // Now safe to update
    conn.execute(
        "UPDATE files SET path = ?1, last_scanned_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![new_path, file_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Execute an organization plan (with file exclusion support)
#[tauri::command]
pub async fn execute_plan(
    plan_id: String,
    stage_first: Option<bool>,
    excluded_file_ids: Option<Vec<i64>>,
    test_mode: Option<bool>,
    db_path: State<'_, DbPath>,
) -> Result<ExecutionResult, String> {
    let db_path_clone = db_path.0.clone();
    let _use_staging = stage_first.unwrap_or(true);
    let is_test_mode = test_mode.unwrap_or(false);
    let excluded: std::collections::HashSet<i64> = excluded_file_ids
        .unwrap_or_default()
        .into_iter()
        .collect();

    // Load plan items from database
    let items: Vec<(i64, String, String)> = {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        let mut stmt = conn.prepare(
            "SELECT file_id, source_path, destination_path
             FROM plan_items
             WHERE plan_id = ?1 AND status = 'pending'"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([&plan_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        }).map_err(|e| e.to_string())?;

        // Filter out excluded files
        rows.filter_map(|r| r.ok())
            .filter(|(file_id, _, _)| !excluded.contains(file_id))
            .collect()
    };

    let mut files_moved = 0;
    let mut files_skipped = 0;
    let mut files_failed = 0;
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    for (file_id, source_path, destination_path) in items {
        let source = std::path::Path::new(&source_path);
        let dest_original = std::path::Path::new(&destination_path);

        // Edge case 1: Check path length (Windows 260 char limit)
        if destination_path.len() > 250 {
            warnings.push(format!("Path may be too long: {}", destination_path));
        }

        // Edge case 2: Check if source and destination are the same
        if source_path == destination_path {
            files_skipped += 1;
            warnings.push(format!("Source and destination are the same: {}", source_path));
            continue;
        }

        // Edge case 3: Check if file is already at destination (previous run)
        if !source.exists() && dest_original.exists() {
            // File was already moved - update database and count as success
            files_skipped += 1;
            if let Ok(conn) = crate::db::open_connection(&db_path_clone) {
                conn.execute(
                    "UPDATE plan_items SET status = 'completed' WHERE plan_id = ?1 AND file_id = ?2",
                    rusqlite::params![&plan_id, file_id],
                ).ok();
                update_file_path_safe(&conn, file_id, &destination_path).ok();
            }
            continue;
        }

        // Edge case 4: Source file doesn't exist
        if !source.exists() {
            errors.push(format!("Source file not found: {}", source_path));
            files_failed += 1;
            continue;
        }

        // Edge case 5: Check for cloud placeholder files (OneDrive)
        if is_cloud_placeholder(source) {
            warnings.push(format!("Cloud file may need to be downloaded first: {}", source_path));
            // Try anyway - Windows might auto-download
        }

        // Create destination directory
        if let Some(parent) = dest_original.parent() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                errors.push(categorize_io_error(&e, &destination_path));
                files_failed += 1;
                continue;
            }
        }

        // Edge case 6: Destination already exists - get unique path
        let final_dest = match get_unique_path(dest_original) {
            Some(path) => path,
            None => {
                errors.push(format!("Could not find unique name for: {}", destination_path));
                files_failed += 1;
                continue;
            }
        };
        let final_dest_path = final_dest.to_string_lossy().to_string();

        // Test mode: simulate the move without actually doing it
        if is_test_mode {
            // In test mode, just count as successful without moving
            if let Ok(conn) = crate::db::open_connection(&db_path_clone) {
                conn.execute(
                    "UPDATE plan_items SET status = 'completed' WHERE plan_id = ?1 AND file_id = ?2",
                    rusqlite::params![&plan_id, file_id],
                ).ok();
            }
            files_moved += 1;
            continue;
        }

        // Attempt to move the file
        let move_result = std::fs::rename(&source, &final_dest);

        match move_result {
            Ok(_) => {
                // Successfully moved via rename
                if let Ok(conn) = crate::db::open_connection(&db_path_clone) {
                    // Record in move history (ignore errors - non-critical)
                    conn.execute(
                        "INSERT INTO move_history (plan_id, file_id, source_path, destination_path)
                         VALUES (?1, ?2, ?3, ?4)",
                        rusqlite::params![&plan_id, file_id, &source_path, &final_dest_path],
                    ).ok();

                    // Update plan item status
                    conn.execute(
                        "UPDATE plan_items SET status = 'completed' WHERE plan_id = ?1 AND file_id = ?2",
                        rusqlite::params![&plan_id, file_id],
                    ).ok();

                    // Update file path safely (handles UNIQUE constraint)
                    if let Err(e) = update_file_path_safe(&conn, file_id, &final_dest_path) {
                        warnings.push(format!("Database update warning for {}: {}", final_dest_path, e));
                    }
                }
                files_moved += 1;
            }
            Err(_rename_err) => {
                // Edge case 7: Cross-device move - try copy + delete
                match std::fs::copy(&source, &final_dest) {
                    Ok(_) => {
                        // Copy succeeded, try to delete source
                        if let Err(del_err) = std::fs::remove_file(&source) {
                            // Edge case 8: Copied but can't delete source
                            warnings.push(format!(
                                "File copied but original couldn't be deleted: {} - {}",
                                source_path,
                                categorize_io_error(&del_err, &source_path)
                            ));
                        }

                        // Update database
                        if let Ok(conn) = crate::db::open_connection(&db_path_clone) {
                            conn.execute(
                                "INSERT INTO move_history (plan_id, file_id, source_path, destination_path)
                                 VALUES (?1, ?2, ?3, ?4)",
                                rusqlite::params![&plan_id, file_id, &source_path, &final_dest_path],
                            ).ok();

                            conn.execute(
                                "UPDATE plan_items SET status = 'completed' WHERE plan_id = ?1 AND file_id = ?2",
                                rusqlite::params![&plan_id, file_id],
                            ).ok();

                            if let Err(e) = update_file_path_safe(&conn, file_id, &final_dest_path) {
                                warnings.push(format!("Database update warning for {}: {}", final_dest_path, e));
                            }
                        }
                        files_moved += 1;
                    }
                    Err(copy_err) => {
                        // Both rename and copy failed - report user-friendly error
                        let error_msg = categorize_io_error(&copy_err, &source_path);
                        errors.push(error_msg);
                        files_failed += 1;
                    }
                }
            }
        }
    }

    // Update plan status
    if let Ok(conn) = crate::db::open_connection(&db_path_clone) {
        conn.execute(
            "UPDATE organization_plans SET status = 'executed', executed_at = CURRENT_TIMESTAMP WHERE id = ?1",
            rusqlite::params![&plan_id],
        ).ok();
    }

    Ok(ExecutionResult {
        files_moved,
        files_failed,
        files_skipped,
        errors,
        warnings,
    })
}

/// Undo the last organization operation
#[tauri::command]
pub async fn undo_last_operation(
    db_path: State<'_, DbPath>,
) -> Result<usize, String> {
    let db_path_clone = db_path.0.clone();

    // Get the most recent plan that was executed and not yet undone
    let moves: Vec<(i64, i64, String, String)> = {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        // Get moves from most recent executed plan that hasn't been undone
        let mut stmt = conn.prepare(
            "SELECT mh.id, mh.file_id, mh.source_path, mh.destination_path
             FROM move_history mh
             JOIN organization_plans op ON mh.plan_id = op.id
             WHERE mh.undone = 0 AND op.status = 'executed'
             ORDER BY mh.moved_at DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        }).map_err(|e| e.to_string())?;

        rows.filter_map(|r| r.ok()).collect()
    };

    if moves.is_empty() {
        return Ok(0);
    }

    let mut undone_count = 0;

    for (history_id, file_id, original_source, current_dest) in moves {
        let source = std::path::Path::new(&current_dest); // Current location (was destination)
        let dest = std::path::Path::new(&original_source); // Original location

        // Check if file exists at current location
        if !source.exists() {
            continue;
        }

        // Create original directory if it doesn't exist
        if let Some(parent) = dest.parent() {
            if let Err(_) = std::fs::create_dir_all(parent) {
                continue;
            }
        }

        // Move back to original location
        let move_result = std::fs::rename(&source, &dest)
            .or_else(|_| {
                // Try copy + delete
                std::fs::copy(&source, &dest).and_then(|_| std::fs::remove_file(&source))
            });

        if move_result.is_ok() {
            // Mark as undone in history
            let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE move_history SET undone = 1, undone_at = CURRENT_TIMESTAMP WHERE id = ?1",
                rusqlite::params![history_id],
            ).map_err(|e| e.to_string())?;

            // Update file path in files table back to original
            conn.execute(
                "UPDATE files SET path = ?1, last_scanned_at = CURRENT_TIMESTAMP WHERE id = ?2",
                rusqlite::params![&original_source, file_id],
            ).map_err(|e| e.to_string())?;

            undone_count += 1;
        }
    }

    Ok(undone_count)
}

// ============================================
// Activity Log Commands (per doc 07)
// ============================================

/// Start a new organization session
#[tauri::command]
pub fn start_organization_session(
    mode: Option<String>,
    user_type: Option<String>,
    db_path: State<'_, DbPath>,
) -> Result<String, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::create_session(&conn, mode.as_deref(), user_type.as_deref())
        .map_err(|e| e.to_string())
}

/// Complete an organization session
#[tauri::command]
pub fn complete_organization_session(
    session_id: String,
    status: String,
    db_path: State<'_, DbPath>,
) -> Result<(), String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    let session_status = SessionStatus::from_str(&status)
        .ok_or_else(|| format!("Invalid status: {}", status))?;
    activity_log::complete_session(&conn, &session_id, session_status)
        .map_err(|e| e.to_string())
}

/// Log a file operation
#[tauri::command]
pub fn log_file_operation(
    session_id: String,
    op_type: String,
    source_path: Option<String>,
    destination_path: Option<String>,
    filename: Option<String>,
    extension: Option<String>,
    size_bytes: Option<i64>,
    confidence: Option<f64>,
    suggested_folder: Option<String>,
    document_type: Option<String>,
    db_path: State<'_, DbPath>,
) -> Result<i32, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let operation = Operation {
        op_type: match op_type.as_str() {
            "move" => OperationType::Move,
            "copy" => OperationType::Copy,
            "create_folder" => OperationType::CreateFolder,
            "rename" => OperationType::Rename,
            "delete" => OperationType::Delete,
            _ => return Err(format!("Invalid operation type: {}", op_type)),
        },
        source_path,
        destination_path,
        filename,
        extension,
        size_bytes,
        confidence,
        suggested_folder,
        document_type,
    };

    activity_log::log_operation(&conn, &session_id, &operation)
        .map_err(|e| e.to_string())
}

/// Update operation status after execution
#[tauri::command]
pub fn update_operation_status(
    session_id: String,
    op_id: i32,
    status: String,
    error_message: Option<String>,
    db_path: State<'_, DbPath>,
) -> Result<(), String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let op_status = OperationStatus::from_str(&status)
        .ok_or_else(|| format!("Invalid status: {}", status))?;

    activity_log::update_operation_status(
        &conn,
        &session_id,
        op_id,
        op_status,
        error_message.as_deref(),
    ).map_err(|e| e.to_string())
}

/// Get recent sessions
#[tauri::command]
pub fn get_recent_sessions(
    limit: Option<i32>,
    db_path: State<'_, DbPath>,
) -> Result<Vec<activity_log::SessionSummary>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::get_recent_sessions(&conn, limit.unwrap_or(10))
        .map_err(|e| e.to_string())
}

/// Get full session log with operations and errors
#[tauri::command]
pub fn get_session_log(
    session_id: String,
    db_path: State<'_, DbPath>,
) -> Result<Option<activity_log::SessionLog>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::get_session_log(&conn, &session_id)
        .map_err(|e| e.to_string())
}

/// Undo a single operation
#[tauri::command]
pub fn undo_session_operation(
    session_id: String,
    op_id: i32,
    db_path: State<'_, DbPath>,
) -> Result<activity_log::UndoResult, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::undo_operation(&conn, &session_id, op_id)
        .map_err(|e| e.to_string())
}

/// Undo entire session
#[tauri::command]
pub fn undo_entire_session(
    session_id: String,
    db_path: State<'_, DbPath>,
) -> Result<activity_log::SessionUndoResult, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::undo_session(&conn, &session_id)
        .map_err(|e| e.to_string())
}

/// Check for incomplete sessions (crash recovery)
#[tauri::command]
pub fn check_incomplete_sessions(
    db_path: State<'_, DbPath>,
) -> Result<Vec<activity_log::SessionSummary>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::check_incomplete_sessions(&conn)
        .map_err(|e| e.to_string())
}

/// Export session log as human-readable text
#[tauri::command]
pub fn export_session_log(
    session_id: String,
    db_path: State<'_, DbPath>,
) -> Result<Option<String>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::export_human_readable(&conn, &session_id)
        .map_err(|e| e.to_string())
}

/// Clean up old session logs
#[tauri::command]
pub fn cleanup_old_sessions(
    retention_days: Option<i32>,
    db_path: State<'_, DbPath>,
) -> Result<i32, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    activity_log::cleanup_old_logs(&conn, retention_days.unwrap_or(90))
        .map_err(|e| e.to_string())
}

// ============================================
// Crash Recovery Commands (per doc 07)
// ============================================

/// Get full details of all incomplete sessions for crash recovery dialog
/// Returns all incomplete sessions (not just the most recent one) so users can recover older crashed sessions
#[tauri::command]
pub fn get_incomplete_session_details(
    db_path: State<'_, DbPath>,
) -> Result<Vec<activity_log::SessionLog>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    crate::recovery::check_incomplete_sessions(&conn)
        .map_err(|e| e.to_string())
}

/// Resume an incomplete session (returns session details for UI to continue)
#[tauri::command]
pub fn resume_incomplete_session(
    session_id: String,
    db_path: State<'_, DbPath>,
) -> Result<activity_log::SessionLog, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    crate::recovery::resume_session(&conn, &session_id)
        .map_err(|e| e.to_string())
}

/// Rollback an incomplete session (undo all completed operations)
#[tauri::command]
pub fn rollback_incomplete_session(
    session_id: String,
    db_path: State<'_, DbPath>,
) -> Result<activity_log::SessionUndoResult, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    crate::recovery::rollback_incomplete(&conn, &session_id)
        .map_err(|e| e.to_string())
}

/// Discard an incomplete session (mark as failed, leave files where they are)
#[tauri::command]
pub fn discard_incomplete_session(
    session_id: String,
    db_path: State<'_, DbPath>,
) -> Result<(), String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;
    crate::recovery::discard_incomplete(&conn, &session_id)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Screen 5/6/7: Review & Clarification Commands
// ============================================================================

/// Category breakdown for Results Preview (Screen 5)
#[derive(Debug, Serialize)]
pub struct CategoryBreakdown {
    pub category: String,
    pub count: i64,
}

/// Get count of files per category
#[tauri::command]
pub fn get_category_breakdown(
    db_path: State<'_, DbPath>,
) -> Result<Vec<CategoryBreakdown>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT
            COALESCE(am.category, 'Review') as category,
            COUNT(*) as count
         FROM files f
         LEFT JOIN ai_metadata am ON f.id = am.file_id
         GROUP BY COALESCE(am.category, 'Review')
         ORDER BY count DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(CategoryBreakdown {
            category: row.get(0)?,
            count: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }

    Ok(results)
}

/// Classified file info for Review screen (Screen 6)
#[derive(Debug, Serialize)]
pub struct ClassifiedFile {
    pub id: i64,
    pub path: String,
    pub filename: String,
    pub extension: Option<String>,
    pub size: i64,
    pub category: String,
    pub subcategory: Option<String>,
    pub confidence: f64,
    pub suggested_path: Option<String>,
    pub summary: Option<String>,
}

/// Get all classified files grouped by category
#[tauri::command]
pub fn get_files_by_category(
    db_path: State<'_, DbPath>,
) -> Result<Vec<ClassifiedFile>, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT
            f.id,
            f.path,
            f.filename,
            f.extension,
            f.size,
            COALESCE(am.category, 'Review') as category,
            am.subcategory,
            COALESCE(am.confidence, 0.0) as confidence,
            am.suggested_path,
            am.summary
         FROM files f
         LEFT JOIN ai_metadata am ON f.id = am.file_id
         ORDER BY category, confidence DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(ClassifiedFile {
            id: row.get(0)?,
            path: row.get(1)?,
            filename: row.get(2)?,
            extension: row.get(3)?,
            size: row.get(4)?,
            category: row.get(5)?,
            subcategory: row.get(6)?,
            confidence: row.get(7)?,
            suggested_path: row.get(8)?,
            summary: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }

    Ok(results)
}

/// Personalization answers from frontend (Screen 4)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalizationInput {
    pub user_roles: Vec<String>,
    pub lookup_style: Option<String>,
    pub folder_depth: Option<String>,
    pub archive_policy: Option<String>,
}

/// Clarification question for frontend (re-export from AI module with Serialize)
#[derive(Debug, Serialize)]
pub struct ClarificationQuestion {
    pub id: String,
    pub question_type: String,
    pub question_en: String,
    pub question_es: String,
    pub why_en: String,
    pub why_es: String,
    pub options: Option<Vec<QuestionOption>>,
    pub placeholder: Option<String>,
    pub suggestion: Option<String>,
    pub max_selections: Option<i32>,
    pub affected_file_ids: Vec<i64>,
    pub affected_filenames: Vec<String>,
    pub candidate_destinations: Vec<CandidateDestination>,
    pub priority: i32,
}

#[derive(Debug, Serialize)]
pub struct QuestionOption {
    pub id: String,
    pub label_en: String,
    pub label_es: String,
    pub is_recommended: bool,
    pub is_skip: bool,
    pub target_category: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CandidateDestination {
    pub category: String,
    pub confidence: f64,
}

impl From<AIClarificationQuestion> for ClarificationQuestion {
    fn from(q: AIClarificationQuestion) -> Self {
        ClarificationQuestion {
            id: q.id,
            question_type: q.question_type,
            question_en: q.question_en,
            question_es: q.question_es,
            why_en: q.why_en,
            why_es: q.why_es,
            options: q.options.map(|opts| opts.into_iter().map(|o| QuestionOption {
                id: o.id,
                label_en: o.label_en,
                label_es: o.label_es,
                is_recommended: o.is_recommended,
                is_skip: o.is_skip,
                target_category: o.target_category,
            }).collect()),
            placeholder: q.placeholder,
            suggestion: q.suggestion,
            max_selections: q.max_selections,
            affected_file_ids: q.affected_file_ids,
            affected_filenames: q.affected_filenames,
            candidate_destinations: q.candidate_destinations.into_iter().map(|d| CandidateDestination {
                category: d.category,
                confidence: d.confidence,
            }).collect(),
            priority: q.priority,
        }
    }
}

/// Generate clarification questions using AI analysis
/// This is the production version that calls Claude to generate smart questions
#[tauri::command]
pub async fn get_clarification_questions(
    personalization: PersonalizationInput,
    db_path: State<'_, DbPath>,
) -> Result<Vec<ClarificationQuestion>, String> {
    let db_path_clone = db_path.0.clone();

    // Step 1: Gather file data from database (sync block)
    let (category_stats, low_confidence_files, ambiguous_groups) = {
        let conn = crate::db::open_connection(&db_path_clone).map_err(|e| e.to_string())?;

        // Get category statistics
        let mut stmt = conn.prepare(
            "SELECT
                COALESCE(am.category, 'Review') as category,
                COUNT(*) as count,
                AVG(COALESCE(am.confidence, 0.5)) as avg_confidence,
                SUM(CASE WHEN COALESCE(am.confidence, 0.5) < 0.70 THEN 1 ELSE 0 END) as low_conf_count
             FROM files f
             LEFT JOIN ai_metadata am ON f.id = am.file_id
             GROUP BY COALESCE(am.category, 'Review')
             ORDER BY count DESC"
        ).map_err(|e| e.to_string())?;

        let category_stats: Vec<AICategoryStats> = stmt
            .query_map([], |row| {
                Ok(AICategoryStats {
                    category: row.get(0)?,
                    count: row.get(1)?,
                    avg_confidence: row.get(2)?,
                    low_confidence_count: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        // Get low confidence files (confidence < 0.70)
        let mut stmt = conn.prepare(
            "SELECT
                f.id, f.filename, am.category, am.subcategory, am.confidence, am.summary
             FROM files f
             JOIN ai_metadata am ON f.id = am.file_id
             WHERE am.confidence < 0.70
               AND am.confidence > 0.30
             ORDER BY am.confidence ASC
             LIMIT 50"
        ).map_err(|e| e.to_string())?;

        let low_confidence_files: Vec<AIFileSummary> = stmt
            .query_map([], |row| {
                Ok(AIFileSummary {
                    id: row.get(0)?,
                    filename: row.get(1)?,
                    category: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "Review".to_string()),
                    subcategory: row.get(3)?,
                    confidence: row.get(4)?,
                    summary: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        // Find ambiguous groups - files with similar names or in same category with varying confidence
        let ambiguous_groups = find_ambiguous_groups(&conn)?;

        (category_stats, low_confidence_files, ambiguous_groups)
    };

    // Step 2: Check if we have enough data to warrant questions
    let total_low_confidence = category_stats.iter()
        .map(|s| s.low_confidence_count)
        .sum::<i64>();

    if total_low_confidence == 0 && ambiguous_groups.is_empty() {
        return Ok(Vec::new());
    }

    // Step 3: Call AI to generate questions
    let config = AIConfig::from_env()?;

    let client = AIClient::new(config);

    // Convert personalization input to AI format
    let ai_personalization = AIPersonalizationAnswers {
        user_roles: personalization.user_roles,
        lookup_style: personalization.lookup_style,
        folder_depth: personalization.folder_depth,
        archive_policy: personalization.archive_policy,
    };

    let result = client.generate_clarification_questions(
        &ai_personalization,
        &category_stats,
        &low_confidence_files,
        &ambiguous_groups,
    ).await?;

    // Convert AI questions to command response format
    let questions: Vec<ClarificationQuestion> = result.questions
        .into_iter()
        .map(ClarificationQuestion::from)
        .collect();

    Ok(questions)
}

/// Find groups of files that might be related or ambiguous
fn find_ambiguous_groups(conn: &Connection) -> Result<Vec<Vec<AIFileSummary>>, String> {
    let mut groups: Vec<Vec<AIFileSummary>> = Vec::new();

    // 1. Find files in Projects/Clients that might need naming
    let mut stmt = conn.prepare(
        "SELECT f.id, f.filename, am.category, am.subcategory, am.confidence, am.summary
         FROM files f
         JOIN ai_metadata am ON f.id = am.file_id
         WHERE am.category IN ('Projects', 'Clients')
         ORDER BY f.filename
         LIMIT 20"
    ).map_err(|e| e.to_string())?;

    let project_files: Vec<AIFileSummary> = stmt
        .query_map([], |row| {
            Ok(AIFileSummary {
                id: row.get(0)?,
                filename: row.get(1)?,
                category: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "Review".to_string()),
                subcategory: row.get(3)?,
                confidence: row.get(4)?,
                summary: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if project_files.len() >= 3 {
        groups.push(project_files);
    }

    // 2. Find car/vehicle/insurance related files (common ambiguity)
    let mut stmt = conn.prepare(
        "SELECT f.id, f.filename, am.category, am.subcategory, am.confidence, am.summary
         FROM files f
         JOIN ai_metadata am ON f.id = am.file_id
         WHERE (LOWER(f.filename) LIKE '%car%'
            OR LOWER(f.filename) LIKE '%vehicle%'
            OR LOWER(f.filename) LIKE '%auto%'
            OR LOWER(f.filename) LIKE '%insurance%')
         LIMIT 15"
    ).map_err(|e| e.to_string())?;

    let car_files: Vec<AIFileSummary> = stmt
        .query_map([], |row| {
            Ok(AIFileSummary {
                id: row.get(0)?,
                filename: row.get(1)?,
                category: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "Review".to_string()),
                subcategory: row.get(3)?,
                confidence: row.get(4)?,
                summary: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if car_files.len() >= 2 {
        groups.push(car_files);
    }

    // 3. Find tax/financial documents that might overlap with legal
    let mut stmt = conn.prepare(
        "SELECT f.id, f.filename, am.category, am.subcategory, am.confidence, am.summary
         FROM files f
         JOIN ai_metadata am ON f.id = am.file_id
         WHERE (LOWER(f.filename) LIKE '%tax%'
            OR LOWER(f.filename) LIKE '%w2%'
            OR LOWER(f.filename) LIKE '%1099%'
            OR LOWER(f.filename) LIKE '%contract%')
           AND am.confidence < 0.80
         LIMIT 15"
    ).map_err(|e| e.to_string())?;

    let tax_files: Vec<AIFileSummary> = stmt
        .query_map([], |row| {
            Ok(AIFileSummary {
                id: row.get(0)?,
                filename: row.get(1)?,
                category: row.get::<_, Option<String>>(2)?.unwrap_or_else(|| "Review".to_string()),
                subcategory: row.get(3)?,
                confidence: row.get(4)?,
                summary: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    if tax_files.len() >= 2 {
        groups.push(tax_files);
    }

    Ok(groups)
}

/// Helper: Translate category name to Spanish
#[allow(dead_code)]
fn translate_category(category: &str) -> String {
    match category {
        "Work" => "Trabajo".to_string(),
        "Money" => "Dinero".to_string(),
        "Home" => "Casa".to_string(),
        "Health" => "Salud".to_string(),
        "Legal" => "Legal".to_string(),
        "School" => "Escuela".to_string(),
        "Family" => "Familia y Amigos".to_string(),
        "Clients" => "Clientes".to_string(),
        "Projects" => "Proyectos".to_string(),
        "Archive" => "Archivo".to_string(),
        "Review" => "Revisar".to_string(),
        _ => category.to_string(),
    }
}

/// Helper: Try to extract a project name suggestion from filenames
#[allow(dead_code)]
fn extract_project_name_suggestion(filenames: &[String]) -> Option<String> {
    if filenames.is_empty() {
        return None;
    }

    // Look for common patterns like "ProjectName_v1.pdf", "ProjectName Draft.docx"
    let first = &filenames[0];

    // Remove common suffixes and extensions
    let name = first
        .trim_end_matches(".pdf")
        .trim_end_matches(".docx")
        .trim_end_matches(".doc")
        .trim_end_matches(".txt")
        .replace("_v1", "")
        .replace("_v2", "")
        .replace("_final", "")
        .replace("_draft", "")
        .replace("_Final", "")
        .replace("_Draft", "")
        .replace('_', " ")
        .trim()
        .to_string();

    if name.len() >= 3 && name.len() <= 50 {
        Some(name)
    } else {
        None
    }
}

/// Get the path to the Organized Files folder
#[tauri::command]
pub fn get_organized_files_path() -> Result<String, String> {
    let organized_path = dirs::document_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("C:\\"))
        .join("Organized Files");
    Ok(organized_path.to_string_lossy().to_string())
}

/// Open a folder in the system file explorer
#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    // Resolve special paths
    let full_path = if path.starts_with("Documents/Organized") || path == "Organized Files" {
        // Get the Documents\Organized Files path
        let base = dirs::document_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("C:\\Documents"));

        if path == "Organized Files" {
            base.join("Organized Files")
        } else {
            // path like "Documents/Organized/00_Review"
            let subfolder = path.strip_prefix("Documents/").unwrap_or(&path);
            base.join(subfolder)
        }
    } else if path == "Documents" {
        dirs::document_dir().unwrap_or_else(|| std::path::PathBuf::from("C:\\Documents"))
    } else {
        // Absolute path
        std::path::PathBuf::from(&path)
    };

    // Create directory if it doesn't exist
    if !full_path.exists() {
        std::fs::create_dir_all(&full_path).ok();
    }

    // Open in Windows Explorer
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&full_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

/// Apply clarification answer to update file categories
#[tauri::command]
pub fn apply_clarification_answer(
    question_id: String,
    answer: String,
    file_ids: Vec<i64>,
    target_category: Option<String>,
    db_path: State<'_, DbPath>,
) -> Result<i32, String> {
    let conn = crate::db::open_connection(&db_path.0).map_err(|e| e.to_string())?;

    let mut updated = 0;

    if let Some(category) = target_category {
        for file_id in file_ids {
            let result = conn.execute(
                "UPDATE ai_metadata SET category = ?1, confidence = 0.95 WHERE file_id = ?2",
                rusqlite::params![category, file_id],
            );

            if result.is_ok() {
                updated += 1;
            }
        }
    }

    // Log the clarification answer for analytics
    println!(
        "[Clarification] Answer applied: question={}, answer={}, files_updated={}",
        question_id, answer, updated
    );

    Ok(updated)
}
