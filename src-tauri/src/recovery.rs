//! Crash Recovery Module
//!
//! Handles detection and recovery of incomplete organization sessions.
//! Per specification document 07.

use rusqlite::{params, Connection, Result as SqlResult};

use crate::activity_log::{
    get_session_log, undo_session, SessionLog, SessionStatus, SessionUndoResult,
};

/// Check for incomplete sessions (status = in_progress)
/// Returns all incomplete sessions (not just the most recent one)
/// This allows users to recover older crashed sessions
pub fn check_incomplete_sessions(conn: &Connection) -> SqlResult<Vec<SessionLog>> {
    // Find all in_progress sessions, most recent first
    let mut stmt = conn.prepare(
        "SELECT session_id FROM sessions
         WHERE status = 'in_progress'
         ORDER BY started_at DESC"
    )?;

    let session_ids: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    let mut sessions = Vec::new();
    for session_id in session_ids {
        if let Some(log) = get_session_log(conn, &session_id)? {
            sessions.push(log);
        }
    }
    Ok(sessions)
}

/// Resume an incomplete session
/// Returns the session log for the UI to continue from where it left off
pub fn resume_session(conn: &Connection, session_id: &str) -> SqlResult<SessionLog> {
    get_session_log(conn, session_id)?
        .ok_or_else(|| rusqlite::Error::QueryReturnedNoRows)
}

/// Rollback an incomplete session
/// Undoes all completed operations in reverse order
pub fn rollback_incomplete(conn: &Connection, session_id: &str) -> SqlResult<SessionUndoResult> {
    undo_session(conn, session_id)
}

/// Discard an incomplete session without undoing
/// Marks the session as failed and leaves files where they are
pub fn discard_incomplete(conn: &Connection, session_id: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE sessions
         SET status = ?1,
             completed_at = CURRENT_TIMESTAMP
         WHERE session_id = ?2",
        params![SessionStatus::Failed.as_str(), session_id],
    )?;

    Ok(())
}

/// Get count of incomplete sessions
#[allow(dead_code)]
pub fn count_incomplete_sessions(conn: &Connection) -> SqlResult<i32> {
    conn.query_row(
        "SELECT COUNT(*) FROM sessions WHERE status = 'in_progress'",
        [],
        |row| row.get(0),
    )
}

/// Mark a session as partial (some ops completed, some failed/skipped)
#[allow(dead_code)]
pub fn mark_session_partial(conn: &Connection, session_id: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE sessions
         SET status = ?1,
             completed_at = CURRENT_TIMESTAMP
         WHERE session_id = ?2",
        params![SessionStatus::Partial.as_str(), session_id],
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::activity_log::create_session;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();

        // Create sessions table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                started_at TEXT DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                status TEXT NOT NULL DEFAULT 'in_progress',
                selected_mode TEXT,
                user_type TEXT,
                total_operations INTEGER DEFAULT 0,
                successful_operations INTEGER DEFAULT 0,
                failed_operations INTEGER DEFAULT 0
            )",
            [],
        ).unwrap();

        // Create operations table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS operations (
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
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                rolled_back_at TEXT,
                error_message TEXT
            )",
            [],
        ).unwrap();

        // Create errors table (activity_errors matches db.rs schema)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS activity_errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                op_id INTEGER,
                error_code TEXT NOT NULL,
                error_message TEXT,
                file_path TEXT,
                severity TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                resolved INTEGER DEFAULT 0,
                resolution TEXT
            )",
            [],
        ).unwrap();

        conn
    }

    #[test]
    fn test_check_incomplete_sessions_none() {
        let conn = setup_test_db();
        let result = check_incomplete_sessions(&conn).unwrap();
        assert!(result.is_empty());
    }

    #[test]
    fn test_check_incomplete_sessions_found() {
        let conn = setup_test_db();

        // Create an incomplete session
        let _session_id = create_session(&conn, Some("simple"), None).unwrap();

        let result = check_incomplete_sessions(&conn).unwrap();
        assert!(!result.is_empty());
    }

    #[test]
    fn test_discard_incomplete() {
        let conn = setup_test_db();

        // Create an incomplete session
        let session_id = create_session(&conn, None, None).unwrap();

        // Discard it
        discard_incomplete(&conn, &session_id).unwrap();

        // Verify it's now marked as failed
        let status: String = conn
            .query_row(
                "SELECT status FROM sessions WHERE session_id = ?1",
                [&session_id],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(status, "failed");
    }

    #[test]
    fn test_count_incomplete_sessions() {
        let conn = setup_test_db();

        // Initially zero
        assert_eq!(count_incomplete_sessions(&conn).unwrap(), 0);

        // Create two incomplete sessions
        create_session(&conn, None, None).unwrap();
        create_session(&conn, None, None).unwrap();

        assert_eq!(count_incomplete_sessions(&conn).unwrap(), 2);
    }
}
