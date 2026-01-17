# Error Handling

> **Document:** 09-error-handling.md  
> **Purpose:** Define error taxonomy, recovery strategies, and UI flows

---

## Error Taxonomy

| Code | Category | Severity | User Message | Recovery |
|------|----------|----------|--------------|----------|
| `FILE_NOT_FOUND` | File | Low | "File was moved or deleted" | Skip |
| `FILE_LOCKED` | File | Medium | "File is open in another app" | Retry later |
| `FILE_IN_USE` | File | Medium | "File is being used" | Retry later |
| `ACCESS_DENIED` | Permission | High | "Permission denied" | Request permission |
| `PATH_TOO_LONG` | Path | Medium | "File path too long" | Shorten or skip |
| `DISK_FULL` | System | Critical | "Not enough disk space" | Free space |
| `NETWORK_ERROR` | Network | Medium | "Network location unavailable" | Retry or skip |
| `CORRUPTED_FILE` | File | Low | "File appears damaged" | Skip |
| `DUPLICATE_EXISTS` | Conflict | Medium | "File already exists" | Rename or skip |
| `FOLDER_CREATE_FAILED` | Folder | High | "Couldn't create folder" | Check permissions |
| `CLASSIFICATION_FAILED` | AI | Low | "Couldn't analyze file" | Route to Review |
| `SERVICE_UNAVAILABLE` | System | High | "Service unavailable" | Retry |

---

## Severity Levels

| Severity | Behavior | User Impact |
|----------|----------|-------------|
| **Low** | Auto-skip, continue | Minimal—file skipped |
| **Medium** | Retry or skip choice | User decides |
| **High** | May need intervention | Operation paused |
| **Critical** | Stop operation | Cannot continue |

---

## Error Handler Architecture

```python
from enum import Enum
from dataclasses import dataclass
from typing import Optional, Callable, List

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class RecoveryAction(Enum):
    SKIP = "skip"
    RETRY = "retry"
    RETRY_LATER = "retry_later"
    RENAME = "rename"
    REQUEST_PERMISSION = "request_permission"
    FREE_SPACE = "free_space"
    ABORT = "abort"
    ROUTE_TO_REVIEW = "route_to_review"

@dataclass
class ErrorContext:
    code: str
    message: str
    file_path: Optional[str]
    severity: ErrorSeverity
    suggested_actions: List[RecoveryAction]
    technical_details: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3


class ErrorHandler:
    def __init__(self, config, ui_callback=None):
        self.config = config
        self.ui_callback = ui_callback
        self.error_log = []
        self.retry_queue = []
    
    def handle(self, error: Exception, context: dict) -> RecoveryAction:
        """Main error handling entry point."""
        error_ctx = self._classify(error, context)
        self._log(error_ctx)
        
        # Auto-recovery for low severity
        if error_ctx.severity == ErrorSeverity.LOW:
            return self._auto_recover(error_ctx)
        
        # Retry for medium severity
        if error_ctx.severity == ErrorSeverity.MEDIUM:
            if error_ctx.retry_count < error_ctx.max_retries:
                return RecoveryAction.RETRY
            return self._escalate(error_ctx)
        
        # User intervention for high/critical
        return self._escalate(error_ctx)
    
    def _classify(self, error, context) -> ErrorContext:
        """Map exception to structured error."""
        
        if isinstance(error, FileNotFoundError):
            return ErrorContext(
                code="FILE_NOT_FOUND",
                message="File was moved or deleted before processing",
                file_path=context.get('path'),
                severity=ErrorSeverity.LOW,
                suggested_actions=[RecoveryAction.SKIP]
            )
        
        if isinstance(error, PermissionError):
            if self._is_locked(context.get('path')):
                return ErrorContext(
                    code="FILE_LOCKED",
                    message="File is open in another application",
                    file_path=context.get('path'),
                    severity=ErrorSeverity.MEDIUM,
                    suggested_actions=[
                        RecoveryAction.RETRY_LATER,
                        RecoveryAction.SKIP
                    ]
                )
            return ErrorContext(
                code="ACCESS_DENIED",
                message="Permission denied",
                file_path=context.get('path'),
                severity=ErrorSeverity.HIGH,
                suggested_actions=[
                    RecoveryAction.REQUEST_PERMISSION,
                    RecoveryAction.SKIP
                ]
            )
        
        if isinstance(error, OSError):
            if error.errno == 28:  # No space
                return ErrorContext(
                    code="DISK_FULL",
                    message="Not enough disk space",
                    file_path=context.get('path'),
                    severity=ErrorSeverity.CRITICAL,
                    suggested_actions=[
                        RecoveryAction.FREE_SPACE,
                        RecoveryAction.ABORT
                    ]
                )
            if error.errno == 36:  # Name too long
                return ErrorContext(
                    code="PATH_TOO_LONG",
                    message="File path is too long",
                    file_path=context.get('path'),
                    severity=ErrorSeverity.MEDIUM,
                    suggested_actions=[
                        RecoveryAction.RENAME,
                        RecoveryAction.SKIP
                    ]
                )
        
        if isinstance(error, FileExistsError):
            return ErrorContext(
                code="DUPLICATE_EXISTS",
                message="File already exists at destination",
                file_path=context.get('path'),
                severity=ErrorSeverity.MEDIUM,
                suggested_actions=[
                    RecoveryAction.RENAME,
                    RecoveryAction.SKIP
                ]
            )
        
        # Default
        return ErrorContext(
            code="UNKNOWN_ERROR",
            message=str(error),
            file_path=context.get('path'),
            severity=ErrorSeverity.MEDIUM,
            suggested_actions=[RecoveryAction.SKIP],
            technical_details=repr(error)
        )
    
    def _is_locked(self, path: str) -> bool:
        """Check if file is locked."""
        if not path:
            return False
        try:
            with open(path, 'a'):
                return False
        except IOError:
            return True
    
    def _auto_recover(self, ctx: ErrorContext) -> RecoveryAction:
        """Handle low-severity errors automatically."""
        if RecoveryAction.ROUTE_TO_REVIEW in ctx.suggested_actions:
            return RecoveryAction.ROUTE_TO_REVIEW
        return RecoveryAction.SKIP
    
    def _escalate(self, ctx: ErrorContext) -> RecoveryAction:
        """Show error to user."""
        if self.ui_callback:
            return self.ui_callback(ctx)
        return ctx.suggested_actions[0] if ctx.suggested_actions else RecoveryAction.SKIP
```

---

## UI Error Flows

### Flow 1: File Locked (Medium Severity)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ File is in use                                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  📄 Budget_2025.xlsx                                  │ │
│  │                                                       │ │
│  │  This file is open in another application.            │ │
│  │  Close it and try again, or skip for now.             │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│     [ Skip this file ]    [ Retry ]    [ Skip all locked ] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Buttons:**
- Skip this file → `RecoveryAction.SKIP`
- Retry → `RecoveryAction.RETRY`
- Skip all locked → `RecoveryAction.SKIP` + remember for session

---

### Flow 2: Permission Denied (High Severity)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🔒 Permission denied                                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  📁 C:\Program Files\...                              │ │
│  │                                                       │ │
│  │  You don't have permission to move files from this    │ │
│  │  location. This might be a protected system folder.   │ │
│  │                                                       │ │
│  │  Options:                                             │ │
│  │  • Run as Administrator (will restart app)            │ │
│  │  • Skip files from this folder                        │ │
│  │  • Remove this folder from scan locations             │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [ Skip ]  [ Remove folder from scan ]  [ Run as Admin ⚡ ] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 3: Disk Full (Critical Severity)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🛑 Not enough disk space                                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  Your destination drive (C:) is almost full.          │ │
│  │                                                       │ │
│  │  Space needed:     ~2.4 GB                            │ │
│  │  Space available:  412 MB                             │ │
│  │                                                       │ │
│  │  ─────────────────────────────────────────────────── │ │
│  │                                                       │ │
│  │  What would you like to do?                           │ │
│  │                                                       │ │
│  │  ○ Free up space (opens Disk Cleanup)                 │ │
│  │  ○ Choose a different destination                     │ │
│  │  ○ Organize fewer files (only high-confidence)        │ │
│  │  ○ Cancel organization                                │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│                              [ Cancel ]    [ Continue → ]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 4: Duplicate File (Medium Severity)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  📋 File already exists                                     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  A file named "Invoice_2025.pdf" already exists       │ │
│  │  in Money/Invoices.                                   │ │
│  │                                                       │ │
│  │  ┌─────────────────┬─────────────────┐               │ │
│  │  │  Existing file  │  New file       │               │ │
│  │  ├─────────────────┼─────────────────┤               │ │
│  │  │  245 KB         │  312 KB         │               │ │
│  │  │  Jan 10, 2025   │  Jan 14, 2025   │               │ │
│  │  └─────────────────┴─────────────────┘               │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [ Keep existing ]  [ Replace ]  [ Keep both (rename) ]    │
│                                                             │
│  ☐ Apply to all duplicates                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Flow 5: Batch Error Summary (Post-Operation)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️ Organization completed with some issues                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  ✅ Successfully organized: 1,576 files               │ │
│  │  ⚠️ Skipped (file in use): 5 files                    │ │
│  │  ⚠️ Skipped (permission denied): 2 files              │ │
│  │  ❌ Failed: 1 file                                     │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Skipped files remain in their original locations.    │ │
│  │  You can retry them later from the Activity Log.      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│   [ View skipped files ]    [ View Activity Log ]          │
│                                                             │
│                                          [ Done ]           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Recovery Strategies

### File Locked Strategy

```python
def handle_file_locked(path: str, context) -> bool:
    """Add to retry queue with backoff."""
    context.retry_queue.append({
        'path': path,
        'retry_at': datetime.now() + timedelta(minutes=5),
        'attempt': context.get_retry_count(path) + 1
    })
    
    # Try to identify locking process
    try:
        import psutil
        for proc in psutil.process_iter(['pid', 'name', 'open_files']):
            for file in proc.info.get('open_files') or []:
                if file.path == path:
                    return {
                        'locked_by': proc.info['name'],
                        'pid': proc.info['pid']
                    }
    except:
        pass
    
    return True
```

### Disk Full Strategy

```python
def handle_disk_full(context) -> dict:
    """Calculate space requirements and options."""
    remaining = context.get_remaining_files()
    estimated = sum(f.size_bytes for f in remaining)
    
    total, used, free = shutil.disk_usage(context.destination_root)
    
    return {
        'space_needed': estimated,
        'space_available': free,
        'can_partial': free > estimated * 0.3,
        'suggestions': [
            f"Free up {format_bytes(estimated - free)}",
            "Choose different destination",
            "Organize high-confidence only"
        ]
    }
```

### Path Too Long Strategy

```python
def handle_path_too_long(path: str, destination: str) -> str:
    """Shorten path to fit Windows MAX_PATH."""
    MAX_PATH = 260
    
    if len(destination) < MAX_PATH:
        return destination
    
    dest_path = Path(destination)
    parent = dest_path.parent
    
    # Calculate available length
    available = MAX_PATH - len(str(parent)) - 1
    
    if available > 20:
        stem = dest_path.stem[:available - len(dest_path.suffix) - 5]
        new_name = f"{stem}~{hash(dest_path.name) % 1000:03d}{dest_path.suffix}"
        return str(parent / new_name)
    
    return None  # Cannot resolve
```

### Duplicate Strategy

```python
def handle_duplicate(source: str, destination: str, strategy: str) -> str:
    """Handle duplicate based on user choice."""
    
    if strategy == "keep_existing":
        return None  # Don't move
    
    elif strategy == "replace":
        # Backup then replace
        backup = Path(destination).with_suffix(
            Path(destination).suffix + '.backup'
        )
        shutil.move(destination, backup)
        return destination
    
    elif strategy == "keep_both":
        return generate_unique_name(destination)
    
    return None


def generate_unique_name(path: str) -> str:
    """Add (1), (2), etc. to filename."""
    p = Path(path)
    counter = 1
    
    while True:
        new_name = f"{p.stem} ({counter}){p.suffix}"
        new_path = p.parent / new_name
        if not new_path.exists():
            return str(new_path)
        counter += 1
        if counter > 100:
            raise ValueError("Too many duplicates")
```

---

## Global Error Handler with Preferences

```python
class GlobalErrorHandler:
    def __init__(self):
        self.preferences = self._load_preferences()
        self.session_choices = {}  # Remember choices this session
    
    def _load_preferences(self) -> dict:
        return {
            'auto_skip_locked': False,
            'auto_rename_duplicates': True,
            'show_error_details': False,
            'retry_locked_files': True,
            'retry_delay_minutes': 5,
            'max_retries': 3
        }
    
    def handle_error(self, ctx: ErrorContext) -> RecoveryAction:
        # Check session choices ("apply to all")
        key = f"{ctx.code}:{ctx.severity.value}"
        if key in self.session_choices:
            return self.session_choices[key]
        
        # Check preferences
        if ctx.code == "FILE_LOCKED" and self.preferences['auto_skip_locked']:
            return RecoveryAction.SKIP
        
        if ctx.code == "DUPLICATE_EXISTS" and self.preferences['auto_rename_duplicates']:
            return RecoveryAction.RENAME
        
        # Show dialog
        result, apply_all = self._show_dialog(ctx)
        
        if apply_all:
            self.session_choices[key] = result
        
        return result
```

---

## Microcopy Reference

| Error Code | Title | Message | Primary Action |
|------------|-------|---------|----------------|
| `FILE_NOT_FOUND` | "File not found" | "This file was moved or deleted." | "Continue" |
| `FILE_LOCKED` | "File is in use" | "This file is open in another app." | "Retry" |
| `ACCESS_DENIED` | "Permission denied" | "You don't have permission." | "Run as Admin" |
| `DISK_FULL` | "Not enough space" | "Destination drive is full." | "Free up space" |
| `PATH_TOO_LONG` | "Path too long" | "File path exceeds Windows limits." | "Shorten name" |
| `DUPLICATE_EXISTS` | "File exists" | "A file with this name exists." | "Keep both" |
| `NETWORK_ERROR` | "Network unavailable" | "Couldn't reach network location." | "Retry" |
| `CORRUPTED_FILE` | "File damaged" | "This file couldn't be read." | "Skip" |

---

## Error Logging Integration

```python
def log_error(session_id: str, ctx: ErrorContext, action: RecoveryAction):
    """Log error to activity log."""
    
    db.execute("""
        INSERT INTO errors (
            session_id, error_code, error_message, 
            file_path, timestamp, resolved, resolution
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, [
        session_id,
        ctx.code,
        ctx.message,
        ctx.file_path,
        datetime.now(),
        action != RecoveryAction.ABORT,
        action.value
    ])
```

---

## Summary

| Severity | Default Behavior | User Interaction |
|----------|-----------------|------------------|
| Low | Auto-skip | None (logged) |
| Medium | Retry then ask | Simple choice dialog |
| High | Stop and ask | Detailed options |
| Critical | Stop operation | Must resolve to continue |
