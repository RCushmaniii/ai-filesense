# Phase 3: Activity Log & Undo System
> **Document:** phases/phase3-activity-log.md  
> **Priority:** CRITICAL  
> **Estimated Effort:** 3-4 days  
> **Dependencies:** Phase 1, Phase 2  
> **Blocks:** None (Phase 4 & 5 can run in parallel)

---

## Objective

Implement complete activity logging and undo capability per specification doc 07. Every file operation must be logged, reversible, and auditable.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ApplyingScreen  │  │  SuccessScreen  │  │ ActivityLogUI   │ │
│  │    (move ops)   │  │   (undo btn)    │  │  (history view) │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           ▼                    ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              activityLog.ts (Service)                    │  │
│  │   startSession() | logOp() | undoOp() | undoSession()    │  │
│  └─────────────────────────────┬───────────────────────────┘  │
└───────────────────────────────│────────────────────────────────┘
                                │ Tauri IPC
┌───────────────────────────────│────────────────────────────────┐
│                         BACKEND                                 │
│  ┌─────────────────────────────▼───────────────────────────┐   │
│  │                commands.rs (Tauri Commands)              │   │
│  │   start_organization_session | log_file_move |           │   │
│  │   undo_last_operation | undo_entire_session              │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                │                                │
│  ┌─────────────────────────────▼───────────────────────────┐   │
│  │                activity_log.rs (Core Logic)              │   │
│  │   create_session | log_operation | undo_operation        │   │
│  │   export_human_readable | cleanup_old_logs               │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                │                                │
│  ┌─────────────────────────────▼───────────────────────────┐   │
│  │                    db.rs (SQLite)                        │   │
│  │         sessions | operations | session_errors           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task List

| # | Task | File(s) | Est. Time |
|---|------|---------|-----------|
| 3.1 | Implement activity_log.rs | `src-tauri/src/activity_log.rs` | 3-4 hours |
| 3.2 | Implement recovery.rs | `src-tauri/src/recovery.rs` | 1-2 hours |
| 3.3 | Add Tauri commands | `src-tauri/src/commands.rs` | 1-2 hours |
| 3.4 | Register commands | `src-tauri/src/lib.rs` | 15 min |
| 3.5 | Implement activityLog.ts | `src/services/activityLog.ts` | 1 hour |
| 3.6 | Create ActivityLog component | `src/components/ActivityLog.tsx` | 2-3 hours |
| 3.7 | Create CrashRecoveryDialog | `src/components/CrashRecoveryDialog.tsx` | 1-2 hours |
| 3.8 | Integrate into ApplyingScreen | `src/screens/ApplyingChangesScreen.tsx` | 1 hour |
| 3.9 | Integrate into SuccessScreen | `src/screens/SuccessScreen.tsx` | 30 min |
| 3.10 | Test undo flows | Manual | 1 hour |

---

## Task 3.1: Implement activity_log.rs

**File:** `src-tauri/src/activity_log.rs`

### Full Implementation

```rust
//! Activity logging and undo system
//!
//! Per specification document 07.

use chrono::{DateTime, Duration, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use uuid::Uuid;

use crate::category::Category;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

    pub fn from_str(s: &str) -> Self {
        match s {
            "in_progress" => SessionStatus::InProgress,
            "completed" => SessionStatus::Completed,
            "partial" => SessionStatus::Partial,
            "rolled_back" => SessionStatus::RolledBack,
            "failed" => SessionStatus::Failed,
            _ => SessionStatus::Failed,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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

    pub fn from_str(s: &str) -> Self {
        match s {
            "move" => OperationType::Move,
            "copy" => OperationType::Copy,
            "create_folder" => OperationType::CreateFolder,
            "rename" => OperationType::Rename,
            "delete" => OperationType::Delete,
            _ => OperationType::Move,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OperationStatus {
    Pending,
    Completed,
    Failed,
    RolledBack,
}

impl OperationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            OperationStatus::Pending => "pending",
            OperationStatus::Completed => "completed",
            OperationStatus::Failed => "failed",
            OperationStatus::RolledBack => "rolled_back",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "pending" => OperationStatus::Pending,
            "completed" => OperationStatus::Completed,
            "failed" => OperationStatus::Failed,
            "rolled_back" => OperationStatus::RolledBack,
            _ => OperationStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub op_id: i32,
    pub op_type: OperationType,
    pub status: OperationStatus,
    pub source_path: String,
    pub destination_path: String,
    pub filename: String,
    pub extension: Option<String>,
    pub size_bytes: u64,
    pub confidence: f32,
    pub suggested_folder: String,
    pub document_type: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub rolled_back_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub session_id: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub status: SessionStatus,
    pub selected_mode: Option<String>,
    pub user_type: Option<String>,
    pub total_operations: i32,
    pub successful_operations: i32,
    pub failed_operations: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLog {
    pub session: Session,
    pub operations: Vec<Operation>,
    pub errors: Vec<SessionError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionError {
    pub id: i32,
    pub op_id: Option<i32>,
    pub error_code: String,
    pub error_message: Option<String>,
    pub file_path: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub resolved: bool,
    pub resolution: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UndoResult {
    pub success: bool,
    pub op_id: i32,
    pub reverted_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionUndoResult {
    pub success: bool,
    pub session_id: String,
    pub operations_reverted: i32,
    pub operations_failed: i32,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub session_id: String,
    pub started_at: DateTime<Utc>,
    pub status: SessionStatus,
    pub total_operations: i32,
    pub successful_operations: i32,
}

// ============================================================================
// Core Functions
// ============================================================================

/// Create a new organization session
pub fn create_session(
    conn: &Connection,
    mode: Option<&str>,
    user_type: Option<&str>,
) -> Result<String, String> {
    let session_id = Uuid::new_v4().to_string();
    let now = Utc::now();

    conn.execute(
        "INSERT INTO sessions (session_id, started_at, status, selected_mode, user_type)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            session_id,
            now.to_rfc3339(),
            SessionStatus::InProgress.as_str(),
            mode,
            user_type
        ],
    )
    .map_err(|e| format!("Failed to create session: {}", e))?;

    Ok(session_id)
}

/// Log a file operation
pub fn log_operation(
    conn: &Connection,
    session_id: &str,
    op: &Operation,
) -> Result<i32, String> {
    // Get next op_id for this session
    let op_id: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(op_id), 0) + 1 FROM operations WHERE session_id = ?1",
            params![session_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get next op_id: {}", e))?;

    conn.execute(
        "INSERT INTO operations (
            session_id, op_id, op_type, status, source_path, destination_path,
            filename, extension, size_bytes, confidence, suggested_folder,
            document_type, timestamp
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            session_id,
            op_id,
            op.op_type.as_str(),
            op.status.as_str(),
            op.source_path,
            op.destination_path,
            op.filename,
            op.extension,
            op.size_bytes as i64,
            op.confidence,
            op.suggested_folder,
            op.document_type,
            Utc::now().to_rfc3339()
        ],
    )
    .map_err(|e| format!("Failed to log operation: {}", e))?;

    // Update session counters
    conn.execute(
        "UPDATE sessions SET total_operations = total_operations + 1 WHERE session_id = ?1",
        params![session_id],
    )
    .ok();

    Ok(op_id)
}

/// Mark operation as completed
pub fn complete_operation(
    conn: &Connection,
    session_id: &str,
    op_id: i32,
) -> Result<(), String> {
    conn.execute(
        "UPDATE operations SET status = 'completed' WHERE session_id = ?1 AND op_id = ?2",
        params![session_id, op_id],
    )
    .map_err(|e| format!("Failed to complete operation: {}", e))?;

    conn.execute(
        "UPDATE sessions SET successful_operations = successful_operations + 1 WHERE session_id = ?1",
        params![session_id],
    )
    .ok();

    Ok(())
}

/// Mark operation as failed
pub fn fail_operation(
    conn: &Connection,
    session_id: &str,
    op_id: i32,
    error_code: &str,
    error_message: Option<&str>,
) -> Result<(), String> {
    conn.execute(
        "UPDATE operations SET status = 'failed' WHERE session_id = ?1 AND op_id = ?2",
        params![session_id, op_id],
    )
    .map_err(|e| format!("Failed to mark operation failed: {}", e))?;

    conn.execute(
        "UPDATE sessions SET failed_operations = failed_operations + 1 WHERE session_id = ?1",
        params![session_id],
    )
    .ok();

    // Log the error
    log_error(conn, session_id, Some(op_id), error_code, error_message, None)?;

    Ok(())
}

/// Log an error
pub fn log_error(
    conn: &Connection,
    session_id: &str,
    op_id: Option<i32>,
    error_code: &str,
    error_message: Option<&str>,
    file_path: Option<&str>,
) -> Result<i32, String> {
    conn.execute(
        "INSERT INTO session_errors (session_id, op_id, error_code, error_message, file_path, timestamp)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            session_id,
            op_id,
            error_code,
            error_message,
            file_path,
            Utc::now().to_rfc3339()
        ],
    )
    .map_err(|e| format!("Failed to log error: {}", e))?;

    Ok(conn.last_insert_rowid() as i32)
}

/// Complete a session
pub fn complete_session(
    conn: &Connection,
    session_id: &str,
    status: SessionStatus,
) -> Result<(), String> {
    conn.execute(
        "UPDATE sessions SET status = ?1, completed_at = ?2 WHERE session_id = ?3",
        params![status.as_str(), Utc::now().to_rfc3339(), session_id],
    )
    .map_err(|e| format!("Failed to complete session: {}", e))?;

    Ok(())
}

/// Undo a single operation
pub fn undo_operation(
    conn: &Connection,
    session_id: &str,
    op_id: i32,
) -> Result<UndoResult, String> {
    // Get the operation
    let op: Operation = conn
        .query_row(
            "SELECT op_type, status, source_path, destination_path, filename
             FROM operations WHERE session_id = ?1 AND op_id = ?2",
            params![session_id, op_id],
            |row| {
                Ok(Operation {
                    op_id,
                    op_type: OperationType::from_str(row.get::<_, String>(0)?.as_str()),
                    status: OperationStatus::from_str(row.get::<_, String>(1)?.as_str()),
                    source_path: row.get(2)?,
                    destination_path: row.get(3)?,
                    filename: row.get(4)?,
                    extension: None,
                    size_bytes: 0,
                    confidence: 0.0,
                    suggested_folder: String::new(),
                    document_type: None,
                    timestamp: Utc::now(),
                    rolled_back_at: None,
                })
            },
        )
        .map_err(|e| format!("Operation not found: {}", e))?;

    // Check if already rolled back
    if op.status == OperationStatus::RolledBack {
        return Ok(UndoResult {
            success: true,
            op_id,
            reverted_path: Some(op.source_path),
            error: Some("Already rolled back".to_string()),
        });
    }

    // Check if operation was completed (can't undo pending or failed)
    if op.status != OperationStatus::Completed {
        return Ok(UndoResult {
            success: false,
            op_id,
            reverted_path: None,
            error: Some(format!("Cannot undo operation with status: {:?}", op.status)),
        });
    }

    // Perform the undo based on operation type
    let undo_result = match op.op_type {
        OperationType::Move => {
            // Move file back to source
            let dest_file = Path::new(&op.destination_path).join(&op.filename);
            let source_file = Path::new(&op.source_path).join(&op.filename);

            match fs::rename(&dest_file, &source_file) {
                Ok(_) => Ok(source_file.to_string_lossy().to_string()),
                Err(e) => Err(format!("Failed to move file back: {}", e)),
            }
        }
        OperationType::Copy => {
            // Delete the copy
            let dest_file = Path::new(&op.destination_path).join(&op.filename);

            match fs::remove_file(&dest_file) {
                Ok(_) => Ok(op.source_path.clone()),
                Err(e) => Err(format!("Failed to delete copy: {}", e)),
            }
        }
        OperationType::CreateFolder => {
            // Remove the folder if empty
            match fs::remove_dir(&op.destination_path) {
                Ok(_) => Ok(op.source_path.clone()),
                Err(e) => Err(format!("Failed to remove folder (may not be empty): {}", e)),
            }
        }
        OperationType::Rename => {
            // Rename back
            let new_path = Path::new(&op.destination_path).join(&op.filename);
            let old_path = &op.source_path;

            match fs::rename(&new_path, old_path) {
                Ok(_) => Ok(old_path.clone()),
                Err(e) => Err(format!("Failed to rename back: {}", e)),
            }
        }
        OperationType::Delete => {
            // Cannot undo delete (file is gone)
            Err("Cannot undo delete operations".to_string())
        }
    };

    match undo_result {
        Ok(reverted_path) => {
            // Mark as rolled back
            conn.execute(
                "UPDATE operations SET status = 'rolled_back', rolled_back_at = ?1
                 WHERE session_id = ?2 AND op_id = ?3",
                params![Utc::now().to_rfc3339(), session_id, op_id],
            )
            .ok();

            Ok(UndoResult {
                success: true,
                op_id,
                reverted_path: Some(reverted_path),
                error: None,
            })
        }
        Err(e) => Ok(UndoResult {
            success: false,
            op_id,
            reverted_path: None,
            error: Some(e),
        }),
    }
}

/// Undo all operations in a session (in reverse order)
pub fn undo_session(conn: &Connection, session_id: &str) -> Result<SessionUndoResult, String> {
    // Get all completed operations in reverse order
    let mut stmt = conn
        .prepare(
            "SELECT op_id FROM operations
             WHERE session_id = ?1 AND status = 'completed'
             ORDER BY op_id DESC",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let op_ids: Vec<i32> = stmt
        .query_map(params![session_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query operations: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    let mut reverted = 0;
    let mut failed = 0;
    let mut errors = Vec::new();

    for op_id in op_ids {
        match undo_operation(conn, session_id, op_id) {
            Ok(result) => {
                if result.success {
                    reverted += 1;
                } else {
                    failed += 1;
                    if let Some(err) = result.error {
                        errors.push(format!("Op {}: {}", op_id, err));
                    }
                }
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("Op {}: {}", op_id, e));
            }
        }
    }

    // Update session status
    let new_status = if failed == 0 {
        SessionStatus::RolledBack
    } else {
        SessionStatus::Partial
    };

    complete_session(conn, session_id, new_status)?;

    Ok(SessionUndoResult {
        success: failed == 0,
        session_id: session_id.to_string(),
        operations_reverted: reverted,
        operations_failed: failed,
        errors,
    })
}

/// Get session log with all operations and errors
pub fn get_session_log(conn: &Connection, session_id: &str) -> Result<SessionLog, String> {
    // Get session
    let session: Session = conn
        .query_row(
            "SELECT session_id, started_at, completed_at, status, selected_mode,
                    user_type, total_operations, successful_operations, failed_operations
             FROM sessions WHERE session_id = ?1",
            params![session_id],
            |row| {
                Ok(Session {
                    session_id: row.get(0)?,
                    started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(1)?)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    completed_at: row
                        .get::<_, Option<String>>(2)?
                        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                        .map(|dt| dt.with_timezone(&Utc)),
                    status: SessionStatus::from_str(&row.get::<_, String>(3)?),
                    selected_mode: row.get(4)?,
                    user_type: row.get(5)?,
                    total_operations: row.get(6)?,
                    successful_operations: row.get(7)?,
                    failed_operations: row.get(8)?,
                })
            },
        )
        .map_err(|e| format!("Session not found: {}", e))?;

    // Get operations
    let mut stmt = conn
        .prepare(
            "SELECT op_id, op_type, status, source_path, destination_path, filename,
                    extension, size_bytes, confidence, suggested_folder, document_type,
                    timestamp, rolled_back_at
             FROM operations WHERE session_id = ?1 ORDER BY op_id",
        )
        .map_err(|e| format!("Failed to prepare operations query: {}", e))?;

    let operations: Vec<Operation> = stmt
        .query_map(params![session_id], |row| {
            Ok(Operation {
                op_id: row.get(0)?,
                op_type: OperationType::from_str(&row.get::<_, String>(1)?),
                status: OperationStatus::from_str(&row.get::<_, String>(2)?),
                source_path: row.get(3)?,
                destination_path: row.get(4)?,
                filename: row.get(5)?,
                extension: row.get(6)?,
                size_bytes: row.get::<_, i64>(7)? as u64,
                confidence: row.get(8)?,
                suggested_folder: row.get(9)?,
                document_type: row.get(10)?,
                timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                rolled_back_at: row
                    .get::<_, Option<String>>(12)?
                    .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                    .map(|dt| dt.with_timezone(&Utc)),
            })
        })
        .map_err(|e| format!("Failed to query operations: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    // Get errors
    let mut stmt = conn
        .prepare(
            "SELECT id, op_id, error_code, error_message, file_path, timestamp, resolved, resolution
             FROM session_errors WHERE session_id = ?1 ORDER BY id",
        )
        .map_err(|e| format!("Failed to prepare errors query: {}", e))?;

    let errors: Vec<SessionError> = stmt
        .query_map(params![session_id], |row| {
            Ok(SessionError {
                id: row.get(0)?,
                op_id: row.get(1)?,
                error_code: row.get(2)?,
                error_message: row.get(3)?,
                file_path: row.get(4)?,
                timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                resolved: row.get(6)?,
                resolution: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to query errors: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(SessionLog {
        session,
        operations,
        errors,
    })
}

/// Get recent sessions
pub fn get_recent_sessions(conn: &Connection, limit: i32) -> Result<Vec<SessionSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT session_id, started_at, status, total_operations, successful_operations
             FROM sessions ORDER BY started_at DESC LIMIT ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let sessions: Vec<SessionSummary> = stmt
        .query_map(params![limit], |row| {
            Ok(SessionSummary {
                session_id: row.get(0)?,
                started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(1)?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                status: SessionStatus::from_str(&row.get::<_, String>(2)?),
                total_operations: row.get(3)?,
                successful_operations: row.get(4)?,
            })
        })
        .map_err(|e| format!("Failed to query sessions: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(sessions)
}

/// Export session as human-readable text
pub fn export_human_readable(conn: &Connection, session_id: &str) -> Result<String, String> {
    let log = get_session_log(conn, session_id)?;
    let mut output = String::new();

    output.push_str(&format!(
        "AI FileSense Activity Log\n\
         ========================\n\n\
         Session: {}\n\
         Started: {}\n\
         Status: {:?}\n\n\
         Summary:\n\
         - Total operations: {}\n\
         - Successful: {}\n\
         - Failed: {}\n\n\
         Operations:\n\
         -----------\n",
        log.session.session_id,
        log.session.started_at.format("%Y-%m-%d %H:%M:%S UTC"),
        log.session.status,
        log.session.total_operations,
        log.session.successful_operations,
        log.session.failed_operations
    ));

    for op in &log.operations {
        output.push_str(&format!(
            "\n{}. {:?} - {:?}\n\
             From: {}\n\
             To:   {}/{}\n",
            op.op_id,
            op.op_type,
            op.status,
            op.source_path,
            op.destination_path,
            op.filename
        ));
    }

    if !log.errors.is_empty() {
        output.push_str("\nErrors:\n-------\n");
        for err in &log.errors {
            output.push_str(&format!(
                "\n[{}] {}: {}\n",
                err.error_code,
                err.file_path.as_deref().unwrap_or("N/A"),
                err.error_message.as_deref().unwrap_or("No message")
            ));
        }
    }

    Ok(output)
}

/// Cleanup old logs (retention policy)
pub fn cleanup_old_logs(conn: &Connection, retention_days: i32) -> Result<i32, String> {
    let cutoff = Utc::now() - Duration::days(retention_days as i64);

    let deleted = conn
        .execute(
            "DELETE FROM sessions WHERE started_at < ?1",
            params![cutoff.to_rfc3339()],
        )
        .map_err(|e| format!("Failed to cleanup logs: {}", e))?;

    Ok(deleted as i32)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../migrations/001_activity_log.sql"))
            .unwrap();
        conn
    }

    #[test]
    fn test_create_session() {
        let conn = setup_test_db();
        let session_id = create_session(&conn, Some("simple"), Some("freelancer")).unwrap();
        assert!(!session_id.is_empty());
    }

    #[test]
    fn test_log_and_complete_operation() {
        let conn = setup_test_db();
        let session_id = create_session(&conn, None, None).unwrap();

        let op = Operation {
            op_id: 0,
            op_type: OperationType::Move,
            status: OperationStatus::Pending,
            source_path: "/source".to_string(),
            destination_path: "/dest".to_string(),
            filename: "test.pdf".to_string(),
            extension: Some("pdf".to_string()),
            size_bytes: 1024,
            confidence: 0.85,
            suggested_folder: "Work".to_string(),
            document_type: Some("Invoice".to_string()),
            timestamp: Utc::now(),
            rolled_back_at: None,
        };

        let op_id = log_operation(&conn, &session_id, &op).unwrap();
        assert_eq!(op_id, 1);

        complete_operation(&conn, &session_id, op_id).unwrap();

        let log = get_session_log(&conn, &session_id).unwrap();
        assert_eq!(log.operations.len(), 1);
        assert_eq!(log.operations[0].status, OperationStatus::Completed);
    }
}
```

### Acceptance Criteria
- [ ] create_session generates UUID and inserts row
- [ ] log_operation assigns sequential op_ids
- [ ] complete_operation updates status and counters
- [ ] fail_operation logs error and updates counters
- [ ] undo_operation reverses move/copy/rename
- [ ] undo_session reverses all operations in reverse order
- [ ] get_session_log returns full session data
- [ ] export_human_readable produces readable text
- [ ] cleanup_old_logs removes old sessions
- [ ] All tests pass

---

## Task 3.2: Implement recovery.rs

**File:** `src-tauri/src/recovery.rs`

### Implementation

```rust
//! Crash recovery for incomplete sessions

use rusqlite::Connection;

use crate::activity_log::{
    get_session_log, undo_session, SessionStatus, SessionUndoResult, SessionLog,
};

/// Check for incomplete sessions (status = in_progress)
pub fn check_incomplete_sessions(conn: &Connection) -> Option<SessionLog> {
    let session_id: Option<String> = conn
        .query_row(
            "SELECT session_id FROM sessions WHERE status = 'in_progress' ORDER BY started_at DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = session_id {
        get_session_log(conn, &id).ok()
    } else {
        None
    }
}

/// Resume an incomplete session (just returns the session for UI to continue)
pub fn resume_session(conn: &Connection, session_id: &str) -> Result<SessionLog, String> {
    get_session_log(conn, session_id)
}

/// Rollback an incomplete session
pub fn rollback_incomplete(conn: &Connection, session_id: &str) -> Result<SessionUndoResult, String> {
    undo_session(conn, session_id)
}

/// Mark an incomplete session as failed (user chose to discard)
pub fn discard_incomplete(conn: &Connection, session_id: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE sessions SET status = 'failed', completed_at = datetime('now') WHERE session_id = ?1",
        [session_id],
    )
    .map_err(|e| format!("Failed to discard session: {}", e))?;

    Ok(())
}
```

---

## Task 3.3: Add Tauri Commands

**File:** `src-tauri/src/commands.rs` (add to existing)

### Implementation

```rust
use crate::activity_log::{
    self, Operation, OperationType, OperationStatus, SessionStatus,
    UndoResult, SessionUndoResult, SessionLog, SessionSummary,
};
use crate::recovery;

#[tauri::command]
pub fn start_organization_session(
    app: tauri::AppHandle,
    mode: Option<String>,
    user_type: Option<String>,
) -> Result<String, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::create_session(&conn, mode.as_deref(), user_type.as_deref())
}

#[tauri::command]
pub fn log_file_move(
    app: tauri::AppHandle,
    session_id: String,
    source: String,
    destination: String,
    filename: String,
    confidence: f32,
    suggested_folder: String,
    document_type: Option<String>,
) -> Result<i32, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let op = Operation {
        op_id: 0, // Will be assigned
        op_type: OperationType::Move,
        status: OperationStatus::Pending,
        source_path: source,
        destination_path: destination,
        filename,
        extension: None,
        size_bytes: 0,
        confidence,
        suggested_folder,
        document_type,
        timestamp: chrono::Utc::now(),
        rolled_back_at: None,
    };

    activity_log::log_operation(&conn, &session_id, &op)
}

#[tauri::command]
pub fn complete_file_move(
    app: tauri::AppHandle,
    session_id: String,
    op_id: i32,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::complete_operation(&conn, &session_id, op_id)
}

#[tauri::command]
pub fn fail_file_move(
    app: tauri::AppHandle,
    session_id: String,
    op_id: i32,
    error_code: String,
    error_message: Option<String>,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::fail_operation(&conn, &session_id, op_id, &error_code, error_message.as_deref())
}

#[tauri::command]
pub fn complete_organization_session(
    app: tauri::AppHandle,
    session_id: String,
    status: String,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    let session_status = match status.as_str() {
        "completed" => SessionStatus::Completed,
        "partial" => SessionStatus::Partial,
        "failed" => SessionStatus::Failed,
        _ => SessionStatus::Completed,
    };
    
    activity_log::complete_session(&conn, &session_id, session_status)
}

#[tauri::command]
pub fn undo_last_operation(
    app: tauri::AppHandle,
    session_id: String,
    op_id: i32,
) -> Result<UndoResult, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::undo_operation(&conn, &session_id, op_id)
}

#[tauri::command]
pub fn undo_entire_session(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<SessionUndoResult, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::undo_session(&conn, &session_id)
}

#[tauri::command]
pub fn get_activity_log(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<SessionLog, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::get_session_log(&conn, &session_id)
}

#[tauri::command]
pub fn get_recent_sessions(
    app: tauri::AppHandle,
    limit: i32,
) -> Result<Vec<SessionSummary>, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::get_recent_sessions(&conn, limit)
}

#[tauri::command]
pub fn export_session_log(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<String, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    activity_log::export_human_readable(&conn, &session_id)
}

#[tauri::command]
pub fn check_incomplete_sessions(app: tauri::AppHandle) -> Result<Option<SessionLog>, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    Ok(recovery::check_incomplete_sessions(&conn))
}

#[tauri::command]
pub fn resume_session(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<SessionLog, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    recovery::resume_session(&conn, &session_id)
}

#[tauri::command]
pub fn rollback_incomplete(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<SessionUndoResult, String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    recovery::rollback_incomplete(&conn, &session_id)
}

#[tauri::command]
pub fn discard_incomplete_session(
    app: tauri::AppHandle,
    session_id: String,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    
    recovery::discard_incomplete(&conn, &session_id)
}
```

---

## Task 3.4: Register Commands in lib.rs

```rust
// Add to the .invoke_handler() call
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    start_organization_session,
    log_file_move,
    complete_file_move,
    fail_file_move,
    complete_organization_session,
    undo_last_operation,
    undo_entire_session,
    get_activity_log,
    get_recent_sessions,
    export_session_log,
    check_incomplete_sessions,
    resume_session,
    rollback_incomplete,
    discard_incomplete_session,
])
```

---

## Task 3.7: CrashRecoveryDialog Component

**File:** `src/components/CrashRecoveryDialog.tsx`

```tsx
import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCcw, Trash2, Play } from 'lucide-react';

interface SessionLog {
  session: {
    sessionId: string;
    startedAt: string;
    totalOperations: number;
    successfulOperations: number;
  };
}

export function CrashRecoveryDialog() {
  const { t } = useTranslation();
  const [incompleteSession, setIncompleteSession] = useState<SessionLog | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check for incomplete sessions on app start
    invoke<SessionLog | null>('check_incomplete_sessions')
      .then((session) => {
        if (session) {
          setIncompleteSession(session);
          setIsOpen(true);
        }
      })
      .catch(console.error);
  }, []);

  const handleResume = async () => {
    if (!incompleteSession) return;
    setProcessing(true);
    // Navigate to resume the session
    // This would typically set app state and navigate
    setIsOpen(false);
  };

  const handleUndo = async () => {
    if (!incompleteSession) return;
    setProcessing(true);
    try {
      await invoke('rollback_incomplete', {
        sessionId: incompleteSession.session.sessionId,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to undo:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDiscard = async () => {
    if (!incompleteSession) return;
    setProcessing(true);
    try {
      await invoke('discard_incomplete_session', {
        sessionId: incompleteSession.session.sessionId,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to discard:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !incompleteSession) return null;

  const { session } = incompleteSession;
  const completedCount = session.successfulOperations;
  const totalCount = session.totalOperations;

  return (
    <div className="modal-overlay">
      <div className="crash-recovery-dialog">
        <div className="dialog-header">
          <AlertTriangle className="warning-icon" />
          <h2>{t('recovery.title')}</h2>
        </div>

        <p className="dialog-message">
          {t('recovery.message', {
            completed: completedCount,
            total: totalCount,
          })}
        </p>

        <div className="dialog-actions">
          <button
            className="btn-secondary"
            onClick={handleResume}
            disabled={processing}
          >
            <Play size={16} />
            {t('recovery.resume')}
          </button>

          <button
            className="btn-warning"
            onClick={handleUndo}
            disabled={processing}
          >
            <RotateCcw size={16} />
            {t('recovery.undo')}
          </button>

          <button
            className="btn-danger"
            onClick={handleDiscard}
            disabled={processing}
          >
            <Trash2 size={16} />
            {t('recovery.discard')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### i18n Keys

```json
{
  "recovery": {
    "title": "Incomplete Organization Found",
    "message": "A previous organization session was interrupted. {{completed}} of {{total}} files were moved.",
    "resume": "Resume",
    "undo": "Undo Changes",
    "discard": "Discard & Start Fresh"
  }
}
```

---

## Phase 3 Completion Checklist

```
[ ] 3.1 activity_log.rs implemented
[ ] 3.2 recovery.rs implemented
[ ] 3.3 Tauri commands added
[ ] 3.4 Commands registered in lib.rs
[ ] 3.5 activityLog.ts service implemented
[ ] 3.6 ActivityLog component implemented
[ ] 3.7 CrashRecoveryDialog implemented
[ ] 3.8 ApplyingScreen uses activity log
[ ] 3.9 SuccessScreen has undo button
[ ] 3.10 Undo single file works
[ ] 3.10 Undo full session works
[ ] Activity log persists across app restarts
[ ] Crash recovery dialog appears for incomplete sessions
[ ] Human-readable export works
[ ] 90-day retention cleanup works
```

---

## Handoff to Phase 4

Once Phase 3 is complete:
1. Commit: `feat: Phase 3 - Activity log and undo system`
2. Tag: `v0.4.0-phase3`
3. Proceed to `phases/phase4-error-handling.md`
