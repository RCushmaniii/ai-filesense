use crate::db::DbPath;
use crate::scanner::{self, ScanConfig, ScannedFile};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

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

/// Organization style options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrganizationStyle {
    LifeAreas,
    Timeline,
    Projects,
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

/// Scan specified directories and index files
#[tauri::command]
pub async fn scan_directories(
    directories: Vec<String>,
    db_path: State<'_, DbPath>,
) -> Result<Vec<ScannedFile>, String> {
    let config = ScanConfig {
        directories: directories.into_iter().map(PathBuf::from).collect(),
        include_hidden: false,
        max_depth: Some(10),
        compute_hashes: true,
        extensions_filter: None,
    };

    let files = scanner::scan_directories(&config);

    // Store in database
    let conn = Connection::open(&db_path.0).map_err(|e| e.to_string())?;

    for file in &files {
        conn.execute(
            "INSERT OR REPLACE INTO files (path, filename, extension, size, created_at, modified_at, content_hash, last_scanned_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)",
            (
                file.path.to_string_lossy().to_string(),
                &file.filename,
                &file.extension,
                file.size as i64,
                &file.created_at,
                &file.modified_at,
                &file.content_hash,
            ),
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(files)
}

/// Get current scan status
#[tauri::command]
pub async fn get_scan_status(db_path: State<'_, DbPath>) -> Result<ScanStatus, String> {
    let conn = Connection::open(&db_path.0).map_err(|e| e.to_string())?;

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
    let conn = Connection::open(&db_path.0).map_err(|e| e.to_string())?;

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
                previous_path: None, // TODO: Get from move_history
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
    let conn = Connection::open(&db_path.0).map_err(|e| e.to_string())?;

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

/// Generate an organization plan based on selected style
#[tauri::command]
pub async fn generate_organization_plan(
    style: OrganizationStyle,
    _db_path: State<'_, DbPath>,
) -> Result<OrganizationPlan, String> {
    // TODO: Implement AI-based plan generation
    // For now, return a placeholder plan
    let plan_id = uuid::Uuid::new_v4().to_string();

    Ok(OrganizationPlan {
        id: plan_id,
        name: format!("{:?} Organization", style),
        style,
        items: vec![],
        summary: PlanSummary {
            total_files: 0,
            high_confidence: 0,
            low_confidence: 0,
            duplicates_found: 0,
            folders_to_create: vec![],
        },
    })
}

/// Execute an organization plan
#[tauri::command]
pub async fn execute_plan(
    plan_id: String,
    _db_path: State<'_, DbPath>,
) -> Result<(), String> {
    // TODO: Implement plan execution with staging
    println!("Executing plan: {}", plan_id);
    Ok(())
}

/// Undo the last organization operation
#[tauri::command]
pub async fn undo_last_operation(
    _db_path: State<'_, DbPath>,
) -> Result<usize, String> {
    // TODO: Implement undo using move_history
    Ok(0)
}
