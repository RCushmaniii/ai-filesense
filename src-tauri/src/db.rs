use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

/// Wrapper for database path, stored in Tauri app state
pub struct DbPath(pub PathBuf);

/// Thread-safe database connection
pub struct DbConnection(pub Mutex<Connection>);

/// Initialize the SQLite database with required tables
pub fn init_database(path: &PathBuf) -> Result<()> {
    let conn = Connection::open(path)?;

    // Files table - core file index
    conn.execute(
        "CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            filename TEXT NOT NULL,
            extension TEXT,
            size INTEGER NOT NULL,
            created_at TEXT,
            modified_at TEXT,
            content_hash TEXT,
            discovered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_scanned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // AI metadata table - classification results
    conn.execute(
        "CREATE TABLE IF NOT EXISTS ai_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL UNIQUE,
            category TEXT,
            subcategory TEXT,
            tags TEXT,
            summary TEXT,
            confidence REAL,
            suggested_path TEXT,
            classified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            model_used TEXT,
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Content snippets - extracted text for AI classification
    conn.execute(
        "CREATE TABLE IF NOT EXISTS content_snippets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL UNIQUE,
            snippet TEXT,
            extraction_method TEXT,
            extracted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Move history - transaction log for undo support
    conn.execute(
        "CREATE TABLE IF NOT EXISTS move_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id TEXT NOT NULL,
            file_id INTEGER NOT NULL,
            source_path TEXT NOT NULL,
            destination_path TEXT NOT NULL,
            moved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            undone INTEGER NOT NULL DEFAULT 0,
            undone_at TEXT,
            FOREIGN KEY (file_id) REFERENCES files(id)
        )",
        [],
    )?;

    // Organization plans - stores generated plans
    conn.execute(
        "CREATE TABLE IF NOT EXISTS organization_plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            organization_style TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            executed_at TEXT,
            status TEXT NOT NULL DEFAULT 'pending'
        )",
        [],
    )?;

    // Plan items - individual file moves in a plan
    conn.execute(
        "CREATE TABLE IF NOT EXISTS plan_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id TEXT NOT NULL,
            file_id INTEGER NOT NULL,
            source_path TEXT NOT NULL,
            destination_path TEXT NOT NULL,
            confidence REAL,
            reason TEXT,
            requires_review INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            FOREIGN KEY (plan_id) REFERENCES organization_plans(id) ON DELETE CASCADE,
            FOREIGN KEY (file_id) REFERENCES files(id)
        )",
        [],
    )?;

    // Create FTS5 virtual table for full-text search
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
            filename,
            path,
            category,
            tags,
            summary,
            content=''
        )",
        [],
    )?;

    // Indexes for performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_files_path ON files(path)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ai_metadata_category ON ai_metadata(category)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_move_history_plan_id ON move_history(plan_id)",
        [],
    )?;

    Ok(())
}
