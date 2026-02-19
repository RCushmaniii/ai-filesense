//! Activity Log Module
//!
//! Implements session tracking and undo capability per doc 07.
//! Every file operation is logged for full reversibility.

use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ============================================
// Types
// ============================================

/// Session status
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    InProgress,
    Completed,
    Partial,
    RolledBack,
    Failed,
}

impl SessionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SessionStatus::InProgress => "in_progress",
            SessionStatus::Completed => "completed",
            SessionStatus::Partial => "partial",
            SessionStatus::RolledBack => "rolled_back",
            SessionStatus::Failed => "failed",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "in_progress" => Some(SessionStatus::InProgress),
            "completed" => Some(SessionStatus::Completed),
            "partial" => Some(SessionStatus::Partial),
            "rolled_back" => Some(SessionStatus::RolledBack),
            "failed" => Some(SessionStatus::Failed),
            _ => None,
        }
    }
}

/// Operation type
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OperationType {
    Move,
    Copy,
    CreateFolder,
    Rename,
    Delete,
}

impl OperationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            OperationType::Move => "move",
            OperationType::Copy => "copy",
            OperationType::CreateFolder => "create_folder",
            OperationType::Rename => "rename",
            OperationType::Delete => "delete",
        }
    }
}

/// Operation status
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OperationStatus {
    Pending,
    Completed,
    Failed,
    RolledBack,
    Skipped,
}

impl OperationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            OperationStatus::Pending => "pending",
            OperationStatus::Completed => "completed",
            OperationStatus::Failed => "failed",
            OperationStatus::RolledBack => "rolled_back",
            OperationStatus::Skipped => "skipped",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(OperationStatus::Pending),
            "completed" => Some(OperationStatus::Completed),
            "failed" => Some(OperationStatus::Failed),
            "rolled_back" => Some(OperationStatus::RolledBack),
            "skipped" => Some(OperationStatus::Skipped),
            _ => None,
        }
    }
}

/// Error severity levels
#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorSeverity {
    Low,      // Auto-skip, log only
    Medium,   // Retry then ask user
    High,     // Stop and ask user
    Critical, // Stop operation entirely
}

impl ErrorSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorSeverity::Low => "low",
            ErrorSeverity::Medium => "medium",
            ErrorSeverity::High => "high",
            ErrorSeverity::Critical => "critical",
        }
    }
}

/// A single operation to log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub op_type: OperationType,
    pub source_path: Option<String>,
    pub destination_path: Option<String>,
    pub filename: Option<String>,
    pub extension: Option<String>,
    pub size_bytes: Option<i64>,
    pub confidence: Option<f64>,
    pub suggested_folder: Option<String>,
    pub document_type: Option<String>,
}

/// Operation record from database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationRecord {
    pub id: i64,
    pub session_id: String,
    pub op_id: i32,
    pub op_type: String,
    pub status: String,
    pub source_path: Option<String>,
    pub destination_path: Option<String>,
    pub filename: Option<String>,
    pub extension: Option<String>,
    pub size_bytes: Option<i64>,
    pub confidence: Option<f64>,
    pub suggested_folder: Option<String>,
    pub document_type: Option<String>,
    pub timestamp: String,
    pub rolled_back_at: Option<String>,
    pub error_message: Option<String>,
}

/// Session summary for list views
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub session_id: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub status: String,
    pub selected_mode: Option<String>,
    pub total_operations: i32,
    pub successful_operations: i32,
    pub failed_operations: i32,
}

/// Full session log with operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLog {
    pub session: SessionSummary,
    pub operations: Vec<OperationRecord>,
    pub errors: Vec<ErrorRecord>,
}

/// Error record from database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorRecord {
    pub id: i64,
    pub session_id: String,
    pub op_id: Option<i32>,
    pub error_code: String,
    pub error_message: Option<String>,
    pub file_path: Option<String>,
    pub severity: Option<String>,
    pub timestamp: String,
    pub resolved: bool,
    pub resolution: Option<String>,
}

/// Result of undoing a single operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UndoResult {
    pub success: bool,
    pub op_id: i32,
    pub message: String,
}

/// Result of undoing an entire session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionUndoResult {
    pub success: bool,
    pub session_id: String,
    pub operations_undone: i32,
    pub operations_failed: i32,
    pub messages: Vec<String>,
}

// ============================================
// Session Management
// ============================================

/// Create a new organization session
pub fn create_session(conn: &Connection, mode: Option<&str>, user_type: Option<&str>) -> SqlResult<String> {
    let session_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO sessions (session_id, selected_mode, user_type, status)
         VALUES (?1, ?2, ?3, 'in_progress')",
        params![session_id, mode, user_type],
    )?;

    Ok(session_id)
}

/// Complete a session with final status
pub fn complete_session(conn: &Connection, session_id: &str, status: SessionStatus) -> SqlResult<()> {
    conn.execute(
        "UPDATE sessions
         SET completed_at = CURRENT_TIMESTAMP,
             status = ?1
         WHERE session_id = ?2",
        params![status.as_str(), session_id],
    )?;

    Ok(())
}

/// Get session summary by ID
pub fn get_session(conn: &Connection, session_id: &str) -> SqlResult<Option<SessionSummary>> {
    let mut stmt = conn.prepare(
        "SELECT session_id, started_at, completed_at, status, selected_mode,
                total_operations, successful_operations, failed_operations
         FROM sessions WHERE session_id = ?1"
    )?;

    let result = stmt.query_row(params![session_id], |row| {
        Ok(SessionSummary {
            session_id: row.get(0)?,
            started_at: row.get(1)?,
            completed_at: row.get(2)?,
            status: row.get(3)?,
            selected_mode: row.get(4)?,
            total_operations: row.get(5)?,
            successful_operations: row.get(6)?,
            failed_operations: row.get(7)?,
        })
    });

    match result {
        Ok(session) => Ok(Some(session)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Get recent sessions
pub fn get_recent_sessions(conn: &Connection, limit: i32) -> SqlResult<Vec<SessionSummary>> {
    let mut stmt = conn.prepare(
        "SELECT session_id, started_at, completed_at, status, selected_mode,
                total_operations, successful_operations, failed_operations
         FROM sessions
         ORDER BY started_at DESC
         LIMIT ?1"
    )?;

    let rows = stmt.query_map(params![limit], |row| {
        Ok(SessionSummary {
            session_id: row.get(0)?,
            started_at: row.get(1)?,
            completed_at: row.get(2)?,
            status: row.get(3)?,
            selected_mode: row.get(4)?,
            total_operations: row.get(5)?,
            successful_operations: row.get(6)?,
            failed_operations: row.get(7)?,
        })
    })?;

    rows.collect()
}

/// Check for incomplete sessions (for crash recovery)
pub fn check_incomplete_sessions(conn: &Connection) -> SqlResult<Vec<SessionSummary>> {
    let mut stmt = conn.prepare(
        "SELECT session_id, started_at, completed_at, status, selected_mode,
                total_operations, successful_operations, failed_operations
         FROM sessions
         WHERE status = 'in_progress'
         ORDER BY started_at DESC"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(SessionSummary {
            session_id: row.get(0)?,
            started_at: row.get(1)?,
            completed_at: row.get(2)?,
            status: row.get(3)?,
            selected_mode: row.get(4)?,
            total_operations: row.get(5)?,
            successful_operations: row.get(6)?,
            failed_operations: row.get(7)?,
        })
    })?;

    rows.collect()
}

// ============================================
// Operation Logging
// ============================================

/// Log an operation within a session
pub fn log_operation(
    conn: &Connection,
    session_id: &str,
    operation: &Operation,
) -> SqlResult<i32> {
    // Get the next op_id for this session
    let op_id: i32 = conn.query_row(
        "SELECT COALESCE(MAX(op_id), 0) + 1 FROM operations WHERE session_id = ?1",
        params![session_id],
        |row| row.get(0),
    )?;

    conn.execute(
        "INSERT INTO operations (
            session_id, op_id, op_type, status,
            source_path, destination_path, filename, extension,
            size_bytes, confidence, suggested_folder, document_type
        ) VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            session_id,
            op_id,
            operation.op_type.as_str(),
            operation.source_path,
            operation.destination_path,
            operation.filename,
            operation.extension,
            operation.size_bytes,
            operation.confidence,
            operation.suggested_folder,
            operation.document_type,
        ],
    )?;

    // Update session total
    conn.execute(
        "UPDATE sessions SET total_operations = total_operations + 1 WHERE session_id = ?1",
        params![session_id],
    )?;

    Ok(op_id)
}

/// Update operation status after execution
pub fn update_operation_status(
    conn: &Connection,
    session_id: &str,
    op_id: i32,
    status: OperationStatus,
    error_message: Option<&str>,
) -> SqlResult<()> {
    conn.execute(
        "UPDATE operations
         SET status = ?1, error_message = ?2
         WHERE session_id = ?3 AND op_id = ?4",
        params![status.as_str(), error_message, session_id, op_id],
    )?;

    // Update session counters
    match status {
        OperationStatus::Completed => {
            conn.execute(
                "UPDATE sessions SET successful_operations = successful_operations + 1
                 WHERE session_id = ?1",
                params![session_id],
            )?;
        }
        OperationStatus::Failed => {
            conn.execute(
                "UPDATE sessions SET failed_operations = failed_operations + 1
                 WHERE session_id = ?1",
                params![session_id],
            )?;
        }
        _ => {}
    }

    Ok(())
}

/// Get all operations for a session
pub fn get_session_operations(conn: &Connection, session_id: &str) -> SqlResult<Vec<OperationRecord>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, op_id, op_type, status,
                source_path, destination_path, filename, extension,
                size_bytes, confidence, suggested_folder, document_type,
                timestamp, rolled_back_at, error_message
         FROM operations
         WHERE session_id = ?1
         ORDER BY op_id ASC"
    )?;

    let rows = stmt.query_map(params![session_id], |row| {
        Ok(OperationRecord {
            id: row.get(0)?,
            session_id: row.get(1)?,
            op_id: row.get(2)?,
            op_type: row.get(3)?,
            status: row.get(4)?,
            source_path: row.get(5)?,
            destination_path: row.get(6)?,
            filename: row.get(7)?,
            extension: row.get(8)?,
            size_bytes: row.get(9)?,
            confidence: row.get(10)?,
            suggested_folder: row.get(11)?,
            document_type: row.get(12)?,
            timestamp: row.get(13)?,
            rolled_back_at: row.get(14)?,
            error_message: row.get(15)?,
        })
    })?;

    rows.collect()
}

// ============================================
// Error Logging
// ============================================

/// Log an error during a session
#[allow(dead_code)]
pub fn log_error(
    conn: &Connection,
    session_id: &str,
    op_id: Option<i32>,
    error_code: &str,
    error_message: Option<&str>,
    file_path: Option<&str>,
    severity: ErrorSeverity,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO activity_errors (
            session_id, op_id, error_code, error_message, file_path, severity
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            session_id,
            op_id,
            error_code,
            error_message,
            file_path,
            severity.as_str(),
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

/// Get all errors for a session
pub fn get_session_errors(conn: &Connection, session_id: &str) -> SqlResult<Vec<ErrorRecord>> {
    let mut stmt = conn.prepare(
        "SELECT id, session_id, op_id, error_code, error_message, file_path,
                severity, timestamp, resolved, resolution
         FROM activity_errors
         WHERE session_id = ?1
         ORDER BY timestamp ASC"
    )?;

    let rows = stmt.query_map(params![session_id], |row| {
        Ok(ErrorRecord {
            id: row.get(0)?,
            session_id: row.get(1)?,
            op_id: row.get(2)?,
            error_code: row.get(3)?,
            error_message: row.get(4)?,
            file_path: row.get(5)?,
            severity: row.get(6)?,
            timestamp: row.get(7)?,
            resolved: row.get(8)?,
            resolution: row.get(9)?,
        })
    })?;

    rows.collect()
}

// ============================================
// Undo Operations
// ============================================

/// Undo a single operation
pub fn undo_operation(conn: &Connection, session_id: &str, op_id: i32) -> SqlResult<UndoResult> {
    // Get the operation details
    let op: Option<OperationRecord> = {
        let mut stmt = conn.prepare(
            "SELECT id, session_id, op_id, op_type, status,
                    source_path, destination_path, filename, extension,
                    size_bytes, confidence, suggested_folder, document_type,
                    timestamp, rolled_back_at, error_message
             FROM operations
             WHERE session_id = ?1 AND op_id = ?2"
        )?;

        stmt.query_row(params![session_id, op_id], |row| {
            Ok(OperationRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                op_id: row.get(2)?,
                op_type: row.get(3)?,
                status: row.get(4)?,
                source_path: row.get(5)?,
                destination_path: row.get(6)?,
                filename: row.get(7)?,
                extension: row.get(8)?,
                size_bytes: row.get(9)?,
                confidence: row.get(10)?,
                suggested_folder: row.get(11)?,
                document_type: row.get(12)?,
                timestamp: row.get(13)?,
                rolled_back_at: row.get(14)?,
                error_message: row.get(15)?,
            })
        }).ok()
    };

    let op = match op {
        Some(o) => o,
        None => {
            return Ok(UndoResult {
                success: false,
                op_id,
                message: "Operation not found".to_string(),
            });
        }
    };

    // Check if already rolled back
    if op.status == "rolled_back" {
        return Ok(UndoResult {
            success: false,
            op_id,
            message: "Operation already rolled back".to_string(),
        });
    }

    // Check if can be undone (only completed moves can be undone)
    if op.status != "completed" || op.op_type != "move" {
        return Ok(UndoResult {
            success: false,
            op_id,
            message: format!("Cannot undo {} operation with status {}", op.op_type, op.status),
        });
    }

    // Perform the actual file move (reverse direction)
    let source = match &op.destination_path {
        Some(p) => p,
        None => {
            return Ok(UndoResult {
                success: false,
                op_id,
                message: "No destination path recorded".to_string(),
            });
        }
    };

    let dest = match &op.source_path {
        Some(p) => p,
        None => {
            return Ok(UndoResult {
                success: false,
                op_id,
                message: "No source path recorded".to_string(),
            });
        }
    };

    // Ensure parent directory exists
    if let Some(parent) = std::path::Path::new(dest).parent() {
        if !parent.exists() {
            if let Err(e) = std::fs::create_dir_all(parent) {
                return Ok(UndoResult {
                    success: false,
                    op_id,
                    message: format!("Failed to create directory {}: {}", parent.display(), e),
                });
            }
        }
    }

    // Try rename first, then copy+delete for cross-device moves
    let move_result = std::fs::rename(source, dest)
        .or_else(|_| {
            std::fs::copy(source, dest).and_then(|_| std::fs::remove_file(source))
        });

    match move_result {
        Ok(_) => {
            // Update the operation status
            conn.execute(
                "UPDATE operations
                 SET status = 'rolled_back', rolled_back_at = CURRENT_TIMESTAMP
                 WHERE session_id = ?1 AND op_id = ?2",
                params![session_id, op_id],
            )?;

            Ok(UndoResult {
                success: true,
                op_id,
                message: "Operation undone successfully".to_string(),
            })
        }
        Err(e) => {
            Ok(UndoResult {
                success: false,
                op_id,
                message: format!("Failed to undo: {}", e),
            })
        }
    }
}

/// Undo all operations in a session (in reverse order)
pub fn undo_session(conn: &Connection, session_id: &str) -> SqlResult<SessionUndoResult> {
    // Get all completed move operations in reverse order
    let mut stmt = conn.prepare(
        "SELECT op_id FROM operations
         WHERE session_id = ?1 AND status = 'completed' AND op_type = 'move'
         ORDER BY op_id DESC"
    )?;

    let op_ids: Vec<i32> = stmt
        .query_map(params![session_id], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    let mut operations_undone = 0;
    let mut operations_failed = 0;
    let mut messages = Vec::new();

    for op_id in op_ids {
        let result = undo_operation(conn, session_id, op_id)?;
        if result.success {
            operations_undone += 1;
        } else {
            operations_failed += 1;
            messages.push(format!("Op {}: {}", op_id, result.message));
        }
    }

    // Update session status
    let new_status = if operations_failed == 0 {
        SessionStatus::RolledBack
    } else {
        SessionStatus::Partial
    };

    complete_session(conn, session_id, new_status)?;

    Ok(SessionUndoResult {
        success: operations_failed == 0,
        session_id: session_id.to_string(),
        operations_undone,
        operations_failed,
        messages,
    })
}

// ============================================
// Full Session Log
// ============================================

/// Get complete session log with operations and errors
pub fn get_session_log(conn: &Connection, session_id: &str) -> SqlResult<Option<SessionLog>> {
    let session = match get_session(conn, session_id)? {
        Some(s) => s,
        None => return Ok(None),
    };

    let operations = get_session_operations(conn, session_id)?;
    let errors = get_session_errors(conn, session_id)?;

    Ok(Some(SessionLog {
        session,
        operations,
        errors,
    }))
}

// ============================================
// Cleanup
// ============================================

/// Clean up old session logs (keep last N days)
pub fn cleanup_old_logs(conn: &Connection, retention_days: i32) -> SqlResult<i32> {
    let deleted = conn.execute(
        "DELETE FROM sessions
         WHERE started_at < datetime('now', ?1 || ' days')",
        params![format!("-{}", retention_days)],
    )?;

    Ok(deleted as i32)
}

// ============================================
// Human-Readable Export
// ============================================

/// Generate a human-readable text summary of a session
pub fn export_human_readable(conn: &Connection, session_id: &str) -> SqlResult<Option<String>> {
    let log = match get_session_log(conn, session_id)? {
        Some(l) => l,
        None => return Ok(None),
    };

    let mut output = String::new();

    output.push_str("========================================\n");
    output.push_str("AI FileSense Activity Log\n");
    output.push_str("========================================\n\n");

    output.push_str(&format!("Session ID: {}\n", log.session.session_id));
    output.push_str(&format!("Started: {}\n", log.session.started_at));
    if let Some(ref completed) = log.session.completed_at {
        output.push_str(&format!("Completed: {}\n", completed));
    }
    output.push_str(&format!("Status: {}\n", log.session.status));
    if let Some(ref mode) = log.session.selected_mode {
        output.push_str(&format!("Mode: {}\n", mode));
    }
    output.push_str(&format!("\nOperations: {} total, {} successful, {} failed\n\n",
        log.session.total_operations,
        log.session.successful_operations,
        log.session.failed_operations
    ));

    output.push_str("Operations:\n");
    output.push_str("----------------------------------------\n");

    for op in &log.operations {
        output.push_str(&format!("[{}] {} - {}\n", op.op_id, op.op_type, op.status));
        if let Some(ref src) = op.source_path {
            output.push_str(&format!("  From: {}\n", src));
        }
        if let Some(ref dst) = op.destination_path {
            output.push_str(&format!("  To: {}\n", dst));
        }
        if let Some(ref err) = op.error_message {
            output.push_str(&format!("  Error: {}\n", err));
        }
        output.push_str("\n");
    }

    if !log.errors.is_empty() {
        output.push_str("\nErrors:\n");
        output.push_str("----------------------------------------\n");
        for err in &log.errors {
            output.push_str(&format!("[{}] {}: {}\n",
                err.error_code,
                err.severity.as_deref().unwrap_or("unknown"),
                err.error_message.as_deref().unwrap_or("No message")
            ));
            if let Some(ref path) = err.file_path {
                output.push_str(&format!("  File: {}\n", path));
            }
        }
    }

    Ok(Some(output))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();

        // Create minimal schema for testing
        conn.execute(
            "CREATE TABLE sessions (
                session_id TEXT PRIMARY KEY,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                status TEXT NOT NULL DEFAULT 'in_progress',
                selected_mode TEXT,
                user_type TEXT,
                total_operations INTEGER DEFAULT 0,
                successful_operations INTEGER DEFAULT 0,
                failed_operations INTEGER DEFAULT 0,
                notes TEXT
            )", []
        ).unwrap();

        conn.execute(
            "CREATE TABLE operations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                op_id INTEGER NOT NULL,
                op_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                source_path TEXT,
                destination_path TEXT,
                filename TEXT,
                extension TEXT,
                size_bytes INTEGER,
                confidence REAL,
                suggested_folder TEXT,
                document_type TEXT,
                timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                rolled_back_at TEXT,
                error_message TEXT,
                UNIQUE(session_id, op_id)
            )", []
        ).unwrap();

        conn.execute(
            "CREATE TABLE activity_errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                op_id INTEGER,
                error_code TEXT NOT NULL,
                error_message TEXT,
                file_path TEXT,
                severity TEXT,
                timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                resolved INTEGER DEFAULT 0,
                resolution TEXT
            )", []
        ).unwrap();

        conn
    }

    #[test]
    fn test_create_session() {
        let conn = setup_test_db();
        let session_id = create_session(&conn, Some("simple"), None).unwrap();
        assert!(!session_id.is_empty());

        let session = get_session(&conn, &session_id).unwrap().unwrap();
        assert_eq!(session.status, "in_progress");
        assert_eq!(session.selected_mode, Some("simple".to_string()));
    }

    #[test]
    fn test_log_operation() {
        let conn = setup_test_db();
        let session_id = create_session(&conn, Some("simple"), None).unwrap();

        let op = Operation {
            op_type: OperationType::Move,
            source_path: Some("/old/path.pdf".to_string()),
            destination_path: Some("/new/path.pdf".to_string()),
            filename: Some("path.pdf".to_string()),
            extension: Some("pdf".to_string()),
            size_bytes: Some(1024),
            confidence: Some(0.85),
            suggested_folder: Some("Work".to_string()),
            document_type: Some("Invoice".to_string()),
        };

        let op_id = log_operation(&conn, &session_id, &op).unwrap();
        assert_eq!(op_id, 1);

        let ops = get_session_operations(&conn, &session_id).unwrap();
        assert_eq!(ops.len(), 1);
        assert_eq!(ops[0].source_path, Some("/old/path.pdf".to_string()));
    }

    #[test]
    fn test_complete_session() {
        let conn = setup_test_db();
        let session_id = create_session(&conn, Some("simple"), None).unwrap();

        complete_session(&conn, &session_id, SessionStatus::Completed).unwrap();

        let session = get_session(&conn, &session_id).unwrap().unwrap();
        assert_eq!(session.status, "completed");
        assert!(session.completed_at.is_some());
    }
}
