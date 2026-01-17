# Activity Log Schema

## Overview

The activity log serves three purposes:
1. **Undo capability** — Reverse any or all operations
2. **Audit trail** — User can see exactly what happened
3. **Crash recovery** — Resume or rollback incomplete operations

---

## Storage Architecture

```
C:\Users\[Username]\AppData\Local\DocumentOrganizer\
├── logs/
│   ├── sessions/
│   │   ├── session_2025-01-14_143022_abc123.json    # Individual session logs
│   │   ├── session_2025-01-10_091544_def456.json
│   │   └── ...
│   ├── activity_log.db                              # SQLite for fast queries
│   └── activity_log_export.txt                      # Human-readable export
├── config/
│   └── settings.json
└── cache/
    └── scan_cache.json
```

---

## Core Schema: Session Log (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SessionLog",
  "type": "object",
  "required": ["session_id", "started_at", "status", "operations"],
  "properties": {
    "session_id": {
      "type": "string",
      "pattern": "^[a-z0-9]{8}$",
      "description": "Unique 8-char identifier for this session"
    },
    "started_at": {
      "type": "string",
      "format": "date-time"
    },
    "completed_at": {
      "type": ["string", "null"],
      "format": "date-time"
    },
    "status": {
      "type": "string",
      "enum": ["in_progress", "completed", "partial", "rolled_back", "failed"]
    },
    "user_context": {
      "type": "object",
      "properties": {
        "user_type": { "type": ["string", "null"] },
        "selected_mode": { "type": "string" },
        "automation_level": { "type": "string" },
        "source_folders": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total_operations": { "type": "integer" },
        "successful": { "type": "integer" },
        "failed": { "type": "integer" },
        "skipped": { "type": "integer" },
        "folders_created": { "type": "integer" },
        "bytes_moved": { "type": "integer" }
      }
    },
    "operations": {
      "type": "array",
      "items": { "$ref": "#/definitions/Operation" }
    },
    "errors": {
      "type": "array",
      "items": { "$ref": "#/definitions/ErrorRecord" }
    }
  },
  "definitions": {
    "Operation": {
      "type": "object",
      "required": ["op_id", "type", "timestamp", "status"],
      "properties": {
        "op_id": {
          "type": "integer",
          "description": "Sequential operation ID within session"
        },
        "type": {
          "type": "string",
          "enum": ["move", "copy", "create_folder", "rename", "delete"]
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "status": {
          "type": "string",
          "enum": ["pending", "completed", "failed", "rolled_back"]
        },
        "source_path": {
          "type": "string",
          "description": "Original file/folder location"
        },
        "destination_path": {
          "type": "string",
          "description": "New file/folder location"
        },
        "file_metadata": {
          "type": "object",
          "properties": {
            "filename": { "type": "string" },
            "extension": { "type": "string" },
            "size_bytes": { "type": "integer" },
            "created_date": { "type": "string", "format": "date-time" },
            "modified_date": { "type": "string", "format": "date-time" },
            "checksum_md5": { "type": "string" }
          }
        },
        "classification": {
          "type": "object",
          "properties": {
            "suggested_folder": { "type": "string" },
            "document_type": { "type": "string" },
            "confidence": { "type": "number" },
            "confidence_reason": { "type": "string" }
          }
        },
        "rollback_info": {
          "type": "object",
          "properties": {
            "can_rollback": { "type": "boolean" },
            "rollback_path": { "type": "string" },
            "rolled_back_at": { "type": ["string", "null"], "format": "date-time" }
          }
        }
      }
    },
    "ErrorRecord": {
      "type": "object",
      "properties": {
        "op_id": { "type": ["integer", "null"] },
        "error_code": { "type": "string" },
        "error_message": { "type": "string" },
        "file_path": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" },
        "resolved": { "type": "boolean" },
        "resolution": { "type": ["string", "null"] }
      }
    }
  }
}
```

---

## Example Session Log

```json
{
  "session_id": "a1b2c3d4",
  "started_at": "2025-01-14T14:30:22Z",
  "completed_at": "2025-01-14T14:35:47Z",
  "status": "completed",
  "user_context": {
    "user_type": "freelancer",
    "selected_mode": "simple",
    "automation_level": "balanced",
    "source_folders": [
      "C:\\Users\\Maria\\Documents",
      "C:\\Users\\Maria\\Downloads"
    ]
  },
  "summary": {
    "total_operations": 1584,
    "successful": 1579,
    "failed": 3,
    "skipped": 2,
    "folders_created": 7,
    "bytes_moved": 2147483648
  },
  "operations": [
    {
      "op_id": 1,
      "type": "create_folder",
      "timestamp": "2025-01-14T14:30:23Z",
      "status": "completed",
      "source_path": null,
      "destination_path": "C:\\Users\\Maria\\Documents\\Organized\\Work",
      "rollback_info": {
        "can_rollback": true,
        "rollback_path": null
      }
    },
    {
      "op_id": 2,
      "type": "move",
      "timestamp": "2025-01-14T14:30:24Z",
      "status": "completed",
      "source_path": "C:\\Users\\Maria\\Downloads\\Q3_Report.docx",
      "destination_path": "C:\\Users\\Maria\\Documents\\Organized\\Work\\Reports\\Q3_Report.docx",
      "file_metadata": {
        "filename": "Q3_Report.docx",
        "extension": "docx",
        "size_bytes": 245760,
        "created_date": "2025-03-15T09:22:00Z",
        "modified_date": "2025-03-15T14:08:00Z",
        "checksum_md5": "d41d8cd98f00b204e9800998ecf8427e"
      },
      "classification": {
        "suggested_folder": "Work",
        "document_type": "Report",
        "confidence": 0.92,
        "confidence_reason": "Filename contains 'Report'"
      },
      "rollback_info": {
        "can_rollback": true,
        "rollback_path": "C:\\Users\\Maria\\Downloads\\Q3_Report.docx",
        "rolled_back_at": null
      }
    }
  ],
  "errors": [
    {
      "op_id": 847,
      "error_code": "FILE_LOCKED",
      "error_message": "File is open in another application",
      "file_path": "C:\\Users\\Maria\\Documents\\Budget_2025.xlsx",
      "timestamp": "2025-01-14T14:33:12Z",
      "resolved": false,
      "resolution": null
    }
  ]
}
```

---

## SQLite Schema (for fast queries)

```sql
-- Main operations table
CREATE TABLE operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    op_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('move', 'copy', 'create_folder', 'rename', 'delete')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back')),
    source_path TEXT,
    destination_path TEXT,
    filename TEXT,
    extension TEXT,
    size_bytes INTEGER,
    confidence REAL,
    suggested_folder TEXT,
    document_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    rolled_back_at DATETIME,
    UNIQUE(session_id, op_id)
);

-- Sessions table
CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'partial', 'rolled_back', 'failed')),
    selected_mode TEXT,
    user_type TEXT,
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0
);

-- Errors table
CREATE TABLE errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    op_id INTEGER,
    error_code TEXT NOT NULL,
    error_message TEXT,
    file_path TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
);

-- Indexes for common queries
CREATE INDEX idx_operations_session ON operations(session_id);
CREATE INDEX idx_operations_status ON operations(status);
CREATE INDEX idx_operations_source ON operations(source_path);
CREATE INDEX idx_operations_dest ON operations(destination_path);
CREATE INDEX idx_errors_session ON errors(session_id);
CREATE INDEX idx_errors_resolved ON errors(resolved);
```

---

## Undo Operations

### Single File Undo

```python
def undo_operation(session_id: str, op_id: int) -> UndoResult:
    """Undo a single operation."""

    op = db.query(
        "SELECT * FROM operations WHERE session_id = ? AND op_id = ?",
        [session_id, op_id]
    )

    if not op:
        return UndoResult(success=False, error="Operation not found")

    if op.status == "rolled_back":
        return UndoResult(success=False, error="Already undone")

    if op.type == "move":
        # Move file back to original location
        try:
            shutil.move(op.destination_path, op.source_path)
            db.execute(
                "UPDATE operations SET status = 'rolled_back', rolled_back_at = ? WHERE id = ?",
                [datetime.now(), op.id]
            )
            return UndoResult(success=True, restored_path=op.source_path)
        except Exception as e:
            return UndoResult(success=False, error=str(e))

    elif op.type == "create_folder":
        # Only delete if empty
        if is_folder_empty(op.destination_path):
            os.rmdir(op.destination_path)
            db.execute("UPDATE operations SET status = 'rolled_back' WHERE id = ?", [op.id])
            return UndoResult(success=True)
        else:
            return UndoResult(success=False, error="Folder not empty")

    # ... handle other operation types
```

### Full Session Undo

```python
def undo_session(session_id: str, progress_callback=None) -> SessionUndoResult:
    """Undo all operations in a session (reverse order)."""

    operations = db.query(
        """SELECT * FROM operations
           WHERE session_id = ? AND status = 'completed'
           ORDER BY op_id DESC""",
        [session_id]
    )

    results = []
    for i, op in enumerate(operations):
        result = undo_operation(session_id, op.op_id)
        results.append(result)

        if progress_callback:
            progress_callback(current=i+1, total=len(operations))

    # Update session status
    successful = sum(1 for r in results if r.success)
    if successful == len(results):
        new_status = "rolled_back"
    elif successful > 0:
        new_status = "partial"
    else:
        new_status = "failed"

    db.execute(
        "UPDATE sessions SET status = ? WHERE session_id = ?",
        [new_status, session_id]
    )

    return SessionUndoResult(
        total=len(results),
        successful=successful,
        failed=len(results) - successful,
        status=new_status
    )
```

---

## Human-Readable Export

```python
def export_activity_log(session_id: str) -> str:
    """Generate human-readable activity log."""

    session = get_session(session_id)
    operations = get_operations(session_id)

    lines = [
        "=" * 60,
        "DOCUMENT ORGANIZER - ACTIVITY LOG",
        "=" * 60,
        "",
        f"Session ID: {session.session_id}",
        f"Date: {session.started_at.strftime('%B %d, %Y at %I:%M %p')}",
        f"Status: {session.status.upper()}",
        "",
        "SUMMARY",
        "-" * 40,
        f"  Total files processed: {session.summary.total_operations}",
        f"  Successfully moved: {session.summary.successful}",
        f"  Failed: {session.summary.failed}",
        f"  Skipped: {session.summary.skipped}",
        f"  Folders created: {session.summary.folders_created}",
        "",
        "OPERATIONS",
        "-" * 40,
    ]

    for op in operations:
        if op.type == "move":
            lines.append(f"  [{op.op_id}] MOVED: {op.file_metadata.filename}")
            lines.append(f"       From: {op.source_path}")
            lines.append(f"       To:   {op.destination_path}")
            lines.append(f"       Reason: {op.classification.confidence_reason}")
            lines.append("")
        elif op.type == "create_folder":
            lines.append(f"  [{op.op_id}] CREATED FOLDER: {op.destination_path}")
            lines.append("")

    if session.errors:
        lines.extend([
            "ERRORS",
            "-" * 40,
        ])
        for error in session.errors:
            lines.append(f"  WARNING {error.error_code}: {error.file_path}")
            lines.append(f"     {error.error_message}")
            lines.append("")

    lines.extend([
        "=" * 60,
        "To undo these changes, open Document Organizer and click",
        "'Undo' in the Activity Log.",
        "=" * 60,
    ])

    return "\n".join(lines)
```

---

## Log Retention Policy

| Log Type | Retention | Reason |
|----------|-----------|--------|
| Session JSON files | 90 days | Full undo capability |
| SQLite database | 1 year | Query history, statistics |
| Human-readable exports | User-controlled | Manual export only |

```python
def cleanup_old_logs(retention_days: int = 90):
    """Remove logs older than retention period."""

    cutoff = datetime.now() - timedelta(days=retention_days)

    # Archive old sessions before deletion
    old_sessions = db.query(
        "SELECT session_id FROM sessions WHERE completed_at < ?",
        [cutoff]
    )

    for session in old_sessions:
        # Export to archive before deletion
        export_path = f"logs/archive/session_{session.session_id}.txt"
        with open(export_path, 'w') as f:
            f.write(export_activity_log(session.session_id))

        # Delete from active logs
        session_file = f"logs/sessions/session_*_{session.session_id}.json"
        for file in glob.glob(session_file):
            os.remove(file)

        db.execute("DELETE FROM operations WHERE session_id = ?", [session.session_id])
        db.execute("DELETE FROM errors WHERE session_id = ?", [session.session_id])
        db.execute("DELETE FROM sessions WHERE session_id = ?", [session.session_id])
```
