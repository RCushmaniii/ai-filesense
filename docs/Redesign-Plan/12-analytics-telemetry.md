# Analytics and Telemetry Schema

> **Document:** 12-analytics-telemetry.md  
> **Purpose:** Define privacy-respecting usage tracking for product improvement

---

## Overview

Analytics help improve the product by understanding:
- Which features are used (and which aren't)
- Where users get stuck or abandon
- What errors occur in the wild
- How performance varies across systems

**Core principle:** Collect the minimum data needed to improve the product. Never collect file contents, names, or anything personally identifiable.

---

## Privacy Framework

### What We NEVER Collect

| Category | Examples | Why Excluded |
|----------|----------|--------------|
| File contents | Document text, OCR output | Privacy violation |
| File names | Invoice_2025.pdf, Tax_Return.docx | Could contain PII |
| Folder paths | C:\Users\Maria\Documents\... | Contains username |
| Personal info | Name, email, location | Not needed |
| Classification details | "Invoice from Acme Corp" | Contains business info |
| Entity names | Client names, company names | Business sensitive |

### What We DO Collect

| Category | Examples | Why Needed |
|----------|----------|------------|
| Feature usage | "User clicked Scan button" | Understand adoption |
| Aggregate counts | "Organized 150 files" | Measure value delivered |
| Error codes | "FILE_LOCKED occurred" | Fix bugs |
| Performance metrics | "Scan took 45 seconds" | Optimize speed |
| System info | "Windows 11, 16GB RAM" | Ensure compatibility |
| UI interactions | "User changed mode to Timeline" | Improve UX |

---

## Consent Model

### Opt-In During Onboarding

```
┌───────────────────────────────────────────────────────────┐
│  ☑️ Help improve Document Organizer                        │
│     (anonymous usage analytics)                           │
│                                                           │
│  [ What data is collected? ]                              │
└───────────────────────────────────────────────────────────┘
```

**Default:** ON (pre-checked)  
**Can change:** Settings → Privacy → Analytics

### Consent States

```python
class AnalyticsConsent(Enum):
    FULL = "full"           # All analytics enabled
    ERRORS_ONLY = "errors"  # Only crash reports
    NONE = "none"           # Completely disabled
```

---

## Event Schema

### Base Event Structure

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnalyticsEvent",
  "type": "object",
  "required": ["event_id", "event_type", "timestamp", "session_id", "app_version"],
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique event identifier"
    },
    "event_type": {
      "type": "string",
      "description": "Event category.action format"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "session_id": {
      "type": "string",
      "description": "Random ID generated per app session, not persistent"
    },
    "app_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "properties": {
      "type": "object",
      "description": "Event-specific properties"
    },
    "context": {
      "$ref": "#/definitions/Context"
    }
  },
  "definitions": {
    "Context": {
      "type": "object",
      "properties": {
        "os_version": { "type": "string" },
        "screen_resolution": { "type": "string" },
        "locale": { "type": "string" },
        "memory_gb": { "type": "integer" },
        "is_portable": { "type": "boolean" }
      }
    }
  }
}
```

### Context Collection

```python
def collect_context() -> dict:
    """Collect non-identifying system context."""
    return {
        "os_version": platform.version(),           # "10.0.22621"
        "os_name": platform.system(),               # "Windows"
        "screen_resolution": get_screen_resolution(), # "1920x1080"
        "screen_count": get_screen_count(),         # 2
        "locale": get_system_locale(),              # "en-US"
        "memory_gb": get_total_memory_gb(),         # 16
        "cpu_cores": os.cpu_count(),                # 8
        "is_portable": is_portable_install(),       # False
        "install_age_days": get_install_age(),      # 45
    }
```

---

## Event Categories

### 1. App Lifecycle Events

| Event Type | When | Properties |
|------------|------|------------|
| `app.launched` | App starts | `launch_type`: normal/startup/tray |
| `app.closed` | App closes | `session_duration_seconds`, `was_organizing` |
| `app.updated` | After update | `previous_version`, `new_version` |
| `app.crashed` | Unhandled exception | `error_type`, `stack_hash` |

**Example:**
```json
{
  "event_type": "app.launched",
  "properties": {
    "launch_type": "normal",
    "time_since_last_launch_hours": 48
  }
}
```

---

### 2. Onboarding Events

| Event Type | When | Properties |
|------------|------|------------|
| `onboarding.started` | First launch | — |
| `onboarding.step_completed` | Each step done | `step_number`, `step_name` |
| `onboarding.skipped` | User skips | `skipped_at_step` |
| `onboarding.completed` | Finished | `total_duration_seconds` |
| `onboarding.tour_started` | Optional tour | — |
| `onboarding.tour_completed` | Tour finished | `steps_viewed` |

**Example:**
```json
{
  "event_type": "onboarding.step_completed",
  "properties": {
    "step_number": 3,
    "step_name": "privacy_permissions",
    "analytics_opted_in": true
  }
}
```

---

### 3. Scan Events

| Event Type | When | Properties |
|------------|------|------------|
| `scan.started` | Scan begins | `location_count`, `file_types` |
| `scan.completed` | Scan finishes | `document_count`, `duration_seconds` |
| `scan.cancelled` | User cancels | `progress_percent`, `reason` |
| `scan.error` | Scan fails | `error_code` |

**Example:**
```json
{
  "event_type": "scan.completed",
  "properties": {
    "document_count": 1584,
    "duration_seconds": 47,
    "location_count": 3,
    "file_types": ["pdf", "docx", "txt"],
    "avg_confidence": 0.78
  }
}
```

**Note:** We track counts, not names or paths.

---

### 4. Organization Events

| Event Type | When | Properties |
|------------|------|------------|
| `organize.mode_selected` | User picks mode | `mode`, `was_recommended` |
| `organize.preview_viewed` | Views preview | `document_count`, `folder_count` |
| `organize.file_reassigned` | Manual change | `from_folder_type`, `to_folder_type` |
| `organize.started` | Apply begins | `document_count`, `mode` |
| `organize.completed` | Apply finishes | `success_count`, `error_count`, `duration` |
| `organize.cancelled` | User stops mid-way | `progress_percent` |

**Example:**
```json
{
  "event_type": "organize.completed",
  "properties": {
    "mode": "simple",
    "document_count": 1584,
    "success_count": 1579,
    "error_count": 3,
    "skipped_count": 2,
    "folders_created": 7,
    "duration_seconds": 312,
    "review_folder_count": 176
  }
}
```

---

### 5. Quick Fix Events

| Event Type | When | Properties |
|------------|------|------------|
| `quickfix.shown` | Questions shown | `question_count` |
| `quickfix.answered` | User answers | `question_index`, `answer_type` |
| `quickfix.skipped` | User skips one | `question_index` |
| `quickfix.skipped_all` | Skips remaining | `remaining_count` |

**Example:**
```json
{
  "event_type": "quickfix.answered",
  "properties": {
    "question_index": 1,
    "question_type": "entity_classification",
    "answer_type": "client",
    "affected_document_count": 34
  }
}
```

**Note:** We track answer_type (client/work/vendor), never the entity name.

---

### 6. Undo Events

| Event Type | When | Properties |
|------------|------|------------|
| `undo.single_file` | Undo one file | `time_since_organize_hours` |
| `undo.full_session` | Undo entire session | `files_restored`, `time_since_organize_hours` |
| `undo.failed` | Undo fails | `error_code`, `files_affected` |

**Example:**
```json
{
  "event_type": "undo.full_session",
  "properties": {
    "files_restored": 1584,
    "time_since_organize_hours": 2.5,
    "success": true
  }
}
```

---

### 7. Auto-Organize Events

| Event Type | When | Properties |
|------------|------|------------|
| `auto_organize.enabled` | Feature turned on | `mode` |
| `auto_organize.disabled` | Feature turned off | `was_enabled_days` |
| `auto_organize.file_detected` | New file found | — |
| `auto_organize.file_processed` | File handled | `action`: suggested/moved/review |
| `auto_organize.suggestion_accepted` | User approves | `time_to_action_minutes` |
| `auto_organize.suggestion_rejected` | User rejects | `time_to_action_minutes` |

**Example:**
```json
{
  "event_type": "auto_organize.file_processed",
  "properties": {
    "action": "moved",
    "confidence": 0.87,
    "folder_type": "money"
  }
}
```

**Note:** We track folder_type (money/work/health), never the actual folder path.

---

### 8. Error Events

| Event Type | When | Properties |
|------------|------|------------|
| `error.file_operation` | File op fails | `error_code`, `recovery_action` |
| `error.classification` | AI fails | `error_type` |
| `error.service` | Service issue | `service_name`, `error_code` |
| `error.unhandled` | Crash | `error_type`, `stack_hash` |

**Example:**
```json
{
  "event_type": "error.file_operation",
  "properties": {
    "error_code": "FILE_LOCKED",
    "recovery_action": "skipped",
    "retry_count": 2
  }
}
```

### Stack Trace Hashing

Never send raw stack traces (may contain paths). Hash them instead:

```python
def hash_stack_trace(traceback_str: str) -> str:
    """
    Create deterministic hash of stack trace.
    Removes file paths, keeps function names and line numbers.
    """
    # Remove absolute paths
    cleaned = re.sub(r'File ".*[/\\]', 'File ".../', traceback_str)
    # Remove usernames from any remaining paths
    cleaned = re.sub(r'Users[/\\][^/\\]+', 'Users/[USER]', cleaned)
    # Hash
    return hashlib.sha256(cleaned.encode()).hexdigest()[:16]
```

---

### 9. Settings Events

| Event Type | When | Properties |
|------------|------|------------|
| `settings.opened` | Settings viewed | — |
| `settings.changed` | Setting modified | `setting_category`, `setting_name` |
| `settings.reset` | Defaults restored | `category` or `all` |

**Example:**
```json
{
  "event_type": "settings.changed",
  "properties": {
    "setting_category": "organization",
    "setting_name": "confidence_threshold",
    "new_value_category": "high"
  }
}
```

**Note:** For sensitive settings, track category not value. E.g., confidence 0.85 → "high".

---

### 10. UI Interaction Events

| Event Type | When | Properties |
|------------|------|------------|
| `ui.screen_viewed` | Screen shown | `screen_name`, `time_on_previous_ms` |
| `ui.button_clicked` | Button pressed | `button_name`, `screen_name` |
| `ui.tooltip_shown` | Help shown | `tooltip_id` |
| `ui.abandoned` | Left without completing | `screen_name`, `time_on_screen_ms` |

**Example:**
```json
{
  "event_type": "ui.screen_viewed",
  "properties": {
    "screen_name": "detailed_review",
    "time_on_previous_screen_ms": 12500,
    "previous_screen": "results_preview"
  }
}
```

---

## Aggregate Metrics

### Daily Rollup (Local)

Calculate locally, send summary only:

```json
{
  "event_type": "daily_summary",
  "properties": {
    "documents_organized_total": 47,
    "auto_organize_suggestions": 12,
    "auto_organize_accepted": 8,
    "errors_encountered": 2,
    "undo_actions": 0,
    "active_time_minutes": 15,
    "review_folder_size": 23
  }
}
```

---

## Implementation

### Event Queue

```python
class AnalyticsManager:
    def __init__(self, config):
        self.config = config
        self.queue = []
        self.session_id = str(uuid.uuid4())
        self.consent = self._load_consent()
        
    def track(self, event_type: str, properties: dict = None):
        """Queue an analytics event."""
        if self.consent == AnalyticsConsent.NONE:
            return
        
        if self.consent == AnalyticsConsent.ERRORS_ONLY:
            if not event_type.startswith('error.'):
                return
        
        event = {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "session_id": self.session_id,
            "app_version": APP_VERSION,
            "properties": self._sanitize(properties or {}),
            "context": self._get_context()
        }
        
        self.queue.append(event)
        
        # Flush if queue is large enough
        if len(self.queue) >= 10:
            self._flush()
    
    def _sanitize(self, properties: dict) -> dict:
        """Remove any potentially sensitive data."""
        sanitized = {}
        
        BLOCKED_KEYS = {'path', 'filename', 'folder_name', 'entity_name', 
                        'content', 'username', 'email'}
        
        for key, value in properties.items():
            if key.lower() in BLOCKED_KEYS:
                continue
            if isinstance(value, str) and ('\\' in value or '/' in value):
                continue  # Looks like a path
            sanitized[key] = value
        
        return sanitized
    
    def _flush(self):
        """Send queued events to analytics backend."""
        if not self.queue:
            return
        
        try:
            # Batch send
            response = requests.post(
                ANALYTICS_ENDPOINT,
                json={"events": self.queue},
                timeout=5
            )
            if response.ok:
                self.queue = []
        except Exception:
            # Fail silently—analytics should never break the app
            pass
```

### Offline Support

```python
class OfflineAnalyticsStore:
    """Store events when offline, sync when connected."""
    
    def __init__(self, db_path):
        self.db_path = db_path
        self._init_db()
    
    def store(self, events: list):
        """Store events for later sync."""
        conn = sqlite3.connect(self.db_path)
        for event in events:
            conn.execute(
                "INSERT INTO pending_events (event_json, created_at) VALUES (?, ?)",
                [json.dumps(event), datetime.utcnow()]
            )
        conn.commit()
        conn.close()
    
    def sync(self) -> int:
        """Attempt to sync stored events. Returns count synced."""
        conn = sqlite3.connect(self.db_path)
        pending = conn.execute(
            "SELECT id, event_json FROM pending_events ORDER BY created_at LIMIT 100"
        ).fetchall()
        
        if not pending:
            return 0
        
        events = [json.loads(row[1]) for row in pending]
        
        try:
            response = requests.post(
                ANALYTICS_ENDPOINT,
                json={"events": events},
                timeout=10
            )
            if response.ok:
                ids = [row[0] for row in pending]
                conn.execute(
                    f"DELETE FROM pending_events WHERE id IN ({','.join('?' * len(ids))})",
                    ids
                )
                conn.commit()
                return len(ids)
        except Exception:
            pass
        
        return 0
```

---

## Dashboard Metrics

### Key Performance Indicators

| KPI | Calculation | Target |
|-----|-------------|--------|
| Activation Rate | Users completing first organization / Installs | >60% |
| Time to Value | Median time from install to first organize | <5 min |
| Completion Rate | organize.completed / organize.started | >90% |
| Undo Rate | undo.full_session / organize.completed (first week) | <20% |
| Auto-Organize Adoption | auto_organize.enabled / total_active_users | >25% |
| Error Rate | error.* events / total_events | <2% |
| Retention (D7) | Active users day 7 / Installs | >40% |
| Retention (D30) | Active users day 30 / Installs | >25% |

### Funnel Analysis

```
Install
  │
  ▼
Onboarding Started ─────────────────► Drop-off
  │
  ▼
Onboarding Completed ───────────────► Drop-off
  │
  ▼
First Scan Started ─────────────────► Drop-off
  │
  ▼
First Scan Completed ───────────────► Drop-off
  │
  ▼
Preview Viewed ─────────────────────► Drop-off (mode confusion?)
  │
  ▼
Organization Started ───────────────► Drop-off (cold feet?)
  │
  ▼
Organization Completed ─────────────► SUCCESS
  │
  ▼
Auto-Organize Enabled ──────────────► POWER USER
```

---

## Data Retention

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Raw events | 90 days | Debug recent issues |
| Aggregated daily | 2 years | Trend analysis |
| Error events | 1 year | Bug tracking |
| User-level aggregates | Never stored | Privacy |

---

## Compliance

### GDPR Considerations

- **No PII collected:** No names, emails, IPs, or paths
- **Consent required:** Opt-in during onboarding
- **Right to disable:** Settings → Privacy
- **Data minimization:** Only what's needed for product improvement

### Data Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  User's PC      │      │  Analytics API  │      │  Dashboard      │
│                 │      │  (No PII)       │      │  (Aggregated)   │
│  ┌───────────┐  │      │                 │      │                 │
│  │ Events    │──┼─────▶│  Receives       │─────▶│  Charts &       │
│  │ (queued)  │  │      │  validates      │      │  metrics        │
│  └───────────┘  │      │  stores         │      │                 │
│                 │      │                 │      │                 │
│  No paths       │      │  No user        │      │  No individual  │
│  No filenames   │      │  identification │      │  user data      │
│  No content     │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## Summary

| Aspect | Approach |
|--------|----------|
| Consent | Opt-in, changeable anytime |
| PII | Never collected |
| File info | Never collected |
| Paths | Never collected |
| Counts | Aggregated only |
| Errors | Code + hash, no details |
| Offline | Queue and sync |
| Retention | 90 days raw, 2 years aggregated |
