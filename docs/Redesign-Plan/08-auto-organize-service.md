# Auto-Organize Background Service

> **Document:** 08-auto-organize-service.md  
> **Purpose:** Define background service for ongoing automatic organization

---

## Overview

The auto-organize service monitors designated folders and automatically (or semi-automatically) organizes new documents based on user preferences.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Windows Service                          │
│                  (DocumentOrganizerService)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   File      │    │  Classifier │    │   Action    │    │
│  │   Watcher   │───▶│   Queue     │───▶│   Engine    │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│        │                  │                   │            │
│        │                  ▼                   ▼            │
│        │           ┌─────────────┐    ┌─────────────┐     │
│        │           │     AI      │    │   Activity  │     │
│        │           │  Classifier │    │     Log     │     │
│        │           └─────────────┘    └─────────────┘     │
│        │                                      │            │
│        ▼                                      ▼            │
│  ┌─────────────┐                      ┌─────────────┐     │
│  │   Tray      │◀─────────────────────│Notification │     │
│  │    Icon     │                      │   Manager   │     │
│  └─────────────┘                      └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AutoOrganizeConfig",
  "type": "object",
  "properties": {
    "enabled": {
      "type": "boolean",
      "default": false
    },
    "mode": {
      "type": "string",
      "enum": ["conservative", "automatic", "scheduled"],
      "default": "conservative"
    },
    "watch_folders": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "include_subfolders": { "type": "boolean", "default": true },
          "file_types": {
            "type": "array",
            "items": { 
              "type": "string", 
              "enum": ["pdf", "doc", "docx", "txt"] 
            }
          }
        }
      },
      "default": [
        { 
          "path": "%USERPROFILE%\\Downloads", 
          "include_subfolders": false, 
          "file_types": ["pdf", "doc", "docx", "txt"] 
        },
        { 
          "path": "%USERPROFILE%\\Desktop", 
          "include_subfolders": false, 
          "file_types": ["pdf", "doc", "docx", "txt"] 
        }
      ]
    },
    "destination_root": {
      "type": "string",
      "default": "%USERPROFILE%\\Documents\\Organized"
    },
    "confidence_threshold": {
      "type": "number",
      "minimum": 0.5,
      "maximum": 1.0,
      "default": 0.75
    },
    "processing_delay_seconds": {
      "type": "integer",
      "minimum": 5,
      "maximum": 300,
      "default": 30
    },
    "batch_interval_minutes": {
      "type": "integer",
      "minimum": 15,
      "maximum": 1440,
      "default": 60
    },
    "notification_settings": {
      "type": "object",
      "properties": {
        "show_toast_notifications": { "type": "boolean", "default": true },
        "notification_frequency": {
          "type": "string",
          "enum": ["every_file", "batched", "daily_summary", "never"],
          "default": "batched"
        },
        "sound_enabled": { "type": "boolean", "default": false }
      }
    },
    "quiet_hours": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": false },
        "start_time": { "type": "string", "default": "22:00" },
        "end_time": { "type": "string", "default": "08:00" }
      }
    },
    "exclusions": {
      "type": "object",
      "properties": {
        "filename_patterns": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["~$*", "*.tmp", "*.partial"]
        },
        "min_file_size_bytes": { "type": "integer", "default": 1024 },
        "max_file_size_bytes": { "type": "integer", "default": 104857600 }
      }
    }
  }
}
```

---

## Mode Comparison

| Feature | Conservative | Automatic | Scheduled |
|---------|-------------|-----------|-----------|
| When files move | User approves | Immediately | At intervals |
| User effort | Medium | Low | Low |
| Risk level | None | Low (undo available) | Low |
| Best for | Cautious users | Confident users | Busy users |
| Notifications | Per-file or batched | Per-file (brief) | Batch summary |

### Conservative Mode
- Files are classified but not moved
- User sees suggestions in dashboard
- Click to approve individual or all

### Automatic Mode
- Files are moved immediately if confidence ≥ threshold
- Low-confidence files go to Review folder
- Undo always available

### Scheduled Mode
- Files accumulate in queue
- Processed in batch at intervals (e.g., hourly)
- Summary notification after each batch

---

## File Watcher Implementation

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from queue import PriorityQueue
from dataclasses import dataclass
from datetime import datetime, timedelta
import threading

@dataclass
class FileEvent:
    priority: int  # Lower = higher priority (timestamp)
    timestamp: datetime
    path: str
    event_type: str  # 'created', 'modified', 'moved_to'
    
    def __lt__(self, other):
        return self.priority < other.priority


class DocumentEventHandler(FileSystemEventHandler):
    def __init__(self, config, queue):
        self.config = config
        self.queue = queue
        self.pending = {}
        self.lock = threading.Lock()
    
    def on_created(self, event):
        if event.is_directory:
            return
        if self._should_process(event.src_path):
            self._schedule(event.src_path, 'created')
    
    def on_moved(self, event):
        if event.is_directory:
            return
        if self._should_process(event.dest_path):
            self._schedule(event.dest_path, 'moved_to')
    
    def _should_process(self, path: str) -> bool:
        """Check if file matches criteria."""
        p = Path(path)
        
        # Check extension
        ext = p.suffix.lower().lstrip('.')
        if ext not in ['pdf', 'doc', 'docx', 'txt']:
            return False
        
        # Check exclusion patterns
        for pattern in self.config.exclusions.filename_patterns:
            if p.match(pattern):
                return False
        
        # Check file size
        try:
            size = p.stat().st_size
            if size < self.config.exclusions.min_file_size_bytes:
                return False
            if size > self.config.exclusions.max_file_size_bytes:
                return False
        except (OSError, PermissionError):
            return False
        
        return True
    
    def _schedule(self, path: str, event_type: str):
        """Schedule file for processing after delay."""
        with self.lock:
            process_time = datetime.now() + timedelta(
                seconds=self.config.processing_delay_seconds
            )
            
            self.queue.put(FileEvent(
                priority=int(process_time.timestamp()),
                timestamp=process_time,
                path=path,
                event_type=event_type
            ))


class FileWatcherService:
    def __init__(self, config):
        self.config = config
        self.queue = PriorityQueue()
        self.observer = Observer()
        self.running = False
    
    def start(self):
        self.running = True
        
        for folder in self.config.watch_folders:
            path = os.path.expandvars(folder['path'])
            handler = DocumentEventHandler(self.config, self.queue)
            
            self.observer.schedule(
                handler,
                path,
                recursive=folder.get('include_subfolders', True)
            )
        
        self.observer.start()
        
        # Start processor thread
        self.processor = threading.Thread(target=self._process_queue)
        self.processor.daemon = True
        self.processor.start()
    
    def stop(self):
        self.running = False
        self.observer.stop()
        self.observer.join()
    
    def _process_queue(self):
        """Process queued files."""
        while self.running:
            try:
                event = self.queue.get(timeout=1)
                
                # Wait until scheduled time
                now = datetime.now()
                if event.timestamp > now:
                    wait = (event.timestamp - now).total_seconds()
                    time.sleep(wait)
                
                if self._file_ready(event.path):
                    self._process_file(event)
                
            except queue.Empty:
                continue
    
    def _file_ready(self, path: str) -> bool:
        """Check if file is ready (not being written)."""
        try:
            p = Path(path)
            if not p.exists():
                return False
            
            # Check size stability
            size1 = p.stat().st_size
            time.sleep(1)
            size2 = p.stat().st_size
            
            return size1 == size2 and size1 > 0
        except:
            return False
    
    def _process_file(self, event):
        """Classify and handle file based on mode."""
        result = classify_document(event.path)
        
        if self.config.mode == 'conservative':
            self._handle_conservative(event.path, result)
        elif self.config.mode == 'automatic':
            self._handle_automatic(event.path, result)
        elif self.config.mode == 'scheduled':
            self._add_to_batch(event.path, result)
    
    def _handle_conservative(self, path, classification):
        """Add to suggestions without moving."""
        db.insert_suggestion(PendingSuggestion(
            source_path=path,
            suggested_folder=classification.suggested_folder,
            confidence=classification.confidence,
            reason=classification.confidence_reason,
            created_at=datetime.now()
        ))
        
        if self.config.notification_settings.show_toast_notifications:
            notify_suggestion(path, classification)
    
    def _handle_automatic(self, path, classification):
        """Move immediately if confidence meets threshold."""
        if classification.confidence >= self.config.confidence_threshold:
            dest = build_destination(
                self.config.destination_root,
                classification.suggested_folder,
                classification.suggested_subfolder,
                Path(path).name
            )
            
            result = move_with_logging(path, dest, classification)
            
            if result.success:
                notify_auto_move(path, dest, classification)
        else:
            # Below threshold → Review
            review_path = Path(self.config.destination_root) / "Review" / Path(path).name
            move_with_logging(path, str(review_path), classification)
```

---

## System Tray Icon

```python
import pystray
from PIL import Image, ImageDraw

class TrayIcon:
    def __init__(self, service, config):
        self.service = service
        self.config = config
        self.pending_count = 0
    
    def create(self):
        image = self._create_image()
        
        menu = pystray.Menu(
            pystray.MenuItem('Document Organizer', None, enabled=False),
            pystray.MenuItem('─────────────', None, enabled=False),
            pystray.MenuItem(
                lambda t: f'Status: {"Running" if self.config.enabled else "Paused"}',
                None, enabled=False
            ),
            pystray.MenuItem(
                lambda t: f'Pending: {self.pending_count}',
                self._open_suggestions
            ),
            pystray.MenuItem('─────────────', None, enabled=False),
            pystray.MenuItem('Mode', pystray.Menu(
                pystray.MenuItem('Conservative', self._set_conservative,
                    checked=lambda i: self.config.mode == 'conservative'),
                pystray.MenuItem('Automatic', self._set_automatic,
                    checked=lambda i: self.config.mode == 'automatic'),
                pystray.MenuItem('Scheduled', self._set_scheduled,
                    checked=lambda i: self.config.mode == 'scheduled'),
            )),
            pystray.MenuItem('Pause', self._toggle_pause,
                checked=lambda i: not self.config.enabled),
            pystray.MenuItem('─────────────', None, enabled=False),
            pystray.MenuItem('Open Organized Folder', self._open_folder),
            pystray.MenuItem('View Activity Log', self._open_log),
            pystray.MenuItem('Settings', self._open_settings),
            pystray.MenuItem('─────────────', None, enabled=False),
            pystray.MenuItem('Quit', self._quit)
        )
        
        return pystray.Icon("DocumentOrganizer", image, "Document Organizer", menu)
    
    def _create_image(self):
        """Generate tray icon."""
        size = 64
        image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        
        # Color based on status
        color = (76, 175, 80) if self.config.enabled else (158, 158, 158)
        
        # Folder shape
        draw.rectangle([8, 20, 56, 52], fill=color)
        draw.rectangle([8, 12, 28, 20], fill=color)
        
        # Badge for pending
        if self.pending_count > 0:
            draw.ellipse([40, 0, 64, 24], fill=(244, 67, 54))
        
        return image
    
    def update_pending(self, count):
        self.pending_count = count
        # Refresh icon
```

---

## Windows Service Registration

### PowerShell Installation Script

```powershell
# install-service.ps1

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop
)

$ServiceName = "DocumentOrganizerService"
$ServicePath = "$PSScriptRoot\DocumentOrganizerService.exe"

if ($Install) {
    Write-Host "Installing Document Organizer Service..."
    
    New-Service -Name $ServiceName `
                -BinaryPathName $ServicePath `
                -DisplayName "Document Organizer Auto-Organize Service" `
                -Description "Automatically organizes new documents." `
                -StartupType Automatic
    
    Write-Host "Service installed. Starting..."
    Start-Service -Name $ServiceName
}

if ($Uninstall) {
    Write-Host "Stopping service..."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    
    Write-Host "Removing service..."
    sc.exe delete $ServiceName
    
    Write-Host "Done."
}

if ($Start) {
    Start-Service -Name $ServiceName
    Write-Host "Service started."
}

if ($Stop) {
    Stop-Service -Name $ServiceName
    Write-Host "Service stopped."
}
```

---

## Notification Templates

### Conservative Mode Notification

```
┌─────────────────────────────────────────┐
│ 📄 Document ready to organize           │
│                                         │
│ Invoice_March2025.pdf                   │
│ → Money/Invoices                        │
│                                         │
│ [Click to review]                       │
└─────────────────────────────────────────┘
```

### Automatic Mode Notification

```
┌─────────────────────────────────────────┐
│ ✓ Document organized                    │
│                                         │
│ Invoice_March2025.pdf                   │
│ → Money/Invoices                        │
└─────────────────────────────────────────┘
```

### Batch Summary Notification

```
┌─────────────────────────────────────────┐
│ 📊 Batch complete                       │
│                                         │
│ 12 documents organized                  │
│ 3 need your review                      │
│                                         │
│ [View details]                          │
└─────────────────────────────────────────┘
```

---

## Notification Manager

```python
from win10toast_click import ToastNotifier

class NotificationManager:
    def __init__(self, config):
        self.config = config
        self.toaster = ToastNotifier()
        self.pending = []
        self.last_notification = None
    
    def notify_suggestion(self, path, classification):
        """Conservative mode: suggest but don't move."""
        if not self.config.notification_settings.show_toast_notifications:
            return
        
        if self._should_batch():
            self.pending.append((path, classification))
            return
        
        self.toaster.show_toast(
            title="Document ready to organize",
            msg=f"{Path(path).name}\n→ {classification.suggested_folder}",
            duration=5,
            threaded=True,
            callback_on_click=lambda: open_suggestions()
        )
    
    def notify_auto_move(self, source, dest, classification):
        """Automatic mode: confirm move."""
        if not self.config.notification_settings.show_toast_notifications:
            return
        
        self.toaster.show_toast(
            title="Document organized",
            msg=f"{Path(source).name}\n→ {classification.suggested_folder}",
            duration=3,
            threaded=True
        )
    
    def notify_batch(self, count):
        """Scheduled mode: batch summary."""
        self.toaster.show_toast(
            title="Batch organization complete",
            msg=f"{count} documents organized",
            duration=5,
            threaded=True,
            callback_on_click=lambda: open_log()
        )
    
    def flush_pending(self):
        """Send batched notification."""
        if not self.pending:
            return
        
        count = len(self.pending)
        self.toaster.show_toast(
            title=f"{count} documents ready to organize",
            msg="Click to review suggestions",
            duration=5,
            threaded=True,
            callback_on_click=lambda: open_suggestions()
        )
        
        self.pending = []
        self.last_notification = datetime.now()
    
    def _should_batch(self):
        freq = self.config.notification_settings.notification_frequency
        
        if freq == 'every_file':
            return False
        if freq == 'never':
            return True
        if freq == 'batched':
            if self.last_notification:
                elapsed = datetime.now() - self.last_notification
                return elapsed.total_seconds() < 300
            return False
        
        return False
```

---

## Settings UI Integration

Dashboard shows auto-organize status:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Auto-Organize: ON (Conservative)                        │
│     New documents are suggested, not moved.                 │
│     [ Change settings ]                                     │
└─────────────────────────────────────────────────────────────┘
```

Settings panel options:

| Setting | Options | Default |
|---------|---------|---------|
| Enable auto-organize | On / Off | Off |
| Mode | Conservative / Automatic / Scheduled | Conservative |
| Watch folders | List with add/remove | Downloads, Desktop |
| Confidence threshold | Slider 50-100% | 75% |
| Processing delay | 5-300 seconds | 30s |
| Notifications | Every file / Batched / Daily / Never | Batched |
| Quiet hours | Enable + time range | Off |

---

## Summary

| Component | Purpose |
|-----------|---------|
| File Watcher | Monitor folders for new documents |
| Classifier Queue | Process files with delay |
| Action Engine | Move/suggest based on mode |
| Notification Manager | Keep user informed |
| Tray Icon | Quick access and status |
| Windows Service | Run in background |
