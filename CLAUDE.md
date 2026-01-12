# AI FileSense

AI-powered local file organization and search for Windows.

## Project Overview

**Core Principle**: LLM does interpretation. The app does execution.

Pipeline:
1. Scan fast (local, deterministic)
2. Sample content (small, controlled extracts)
3. LLM classification (batched, cached, incremental)
4. User chooses structure (in plain English, with preview)
5. Planner generates a move plan (JSON manifest + DB record)
6. Executor moves files safely (staging + transaction log + undo)
7. Search stays amazing forever (semantic + "used to be on Desktop")

## Tech Stack

- **Desktop Shell**: Tauri 2
- **Backend**: Rust (file engine: scanning, hashing, reading snippets, move/undo)
- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: SQLite with FTS5 for full-text search
- **AI Providers**: OpenAI or Anthropic API (user configurable)

## Project Structure

```
ai-filesense/
├── src/                    # React frontend
│   ├── components/         # UI components (shadcn/ui based)
│   ├── hooks/              # React hooks
│   ├── lib/                # Utilities (cn, api client, etc.)
│   ├── pages/              # Route pages
│   └── App.tsx             # Main app component
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands.rs     # Tauri command handlers
│   │   ├── db.rs           # SQLite database operations
│   │   ├── scanner.rs      # File system scanning
│   │   ├── lib.rs          # Library entry point
│   │   └── main.rs         # Application entry point
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── package.json            # Node dependencies
```

## Development Commands

```bash
# Install dependencies
npm install

# Run in development mode (requires Rust)
npm run tauri dev

# Build for production
npm run tauri build

# Run frontend only (without Tauri)
npm run dev
```

## Rust Prerequisites

Tauri 2 requires Rust. Install via: https://rustup.rs/

Windows also needs:
- Microsoft Visual Studio C++ Build Tools
- WebView2 (pre-installed on Windows 11, installable on Windows 10)

## Database Schema

SQLite database located at: `%APPDATA%/com.aifileense.app/filesense.db`

**Core Tables**:
- `files` - File index with path, metadata, hash
- `ai_metadata` - AI classification results (category, tags, summary, confidence)
- `content_snippets` - Extracted text for AI processing
- `move_history` - Transaction log for undo support
- `organization_plans` - Generated organization plans
- `plan_items` - Individual file moves within a plan
- `files_fts` - FTS5 virtual table for full-text search

## Key Design Decisions

1. **Snippet caps**: Only extract first page/first N lines to keep AI calls fast
2. **Batch AI calls**: Send 20-100 files per request, not one-by-one
3. **Incremental indexing**: Only re-process changed files (hash + modified date check)
4. **Safe moves**: All file moves logged in transaction table for full undo support
5. **Staging mode**: Optional staging before final moves (recommended)
6. **No full drive scans by default**: Desktop + Documents + Downloads only

## AI Integration Points

- `src-tauri/src/commands.rs`: `generate_organization_plan` - calls AI for classification
- AI receives: filename, metadata, small text snippet
- AI returns: category, subcategory, tags, confidence, summary, suggested path

## Testing

```bash
# Rust tests
cd src-tauri && cargo test

# Frontend tests (when added)
npm test
```

## Common Tasks

### Adding a new Tauri command

1. Add function in `src-tauri/src/commands.rs`
2. Register in `src-tauri/src/lib.rs` in `invoke_handler`
3. Call from frontend via `@tauri-apps/api`

### Adding a new UI component

Use shadcn/ui CLI or manually create in `src/components/ui/`

### Modifying the database schema

Update `src-tauri/src/db.rs` in `init_database()` function
