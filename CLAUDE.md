# AI FileSense

AI-powered local file organization for Windows.

## Localization

This app is **bilingual**: English + Spanish (Mexico). All user-facing strings must be in `src/i18n/`.

## Project Overview

**Core Principle**: LLM does interpretation. The app does execution.

**Freemium Model**: The developer provides the Anthropic API key via environment variable. Users do NOT need to configure API keys - this reduces friction and makes the app accessible to non-technical users.

Pipeline:
1. Scan fast (local, deterministic)
2. Sample content (small, controlled extracts)
3. LLM classification using Claude Haiku (batched, cached, incremental)
4. User chooses structure (in plain English, with preview)
5. Planner generates a move plan (JSON manifest + DB record)
6. Executor moves files safely (staging + transaction log + undo)

## Tech Stack

- **Desktop Shell**: Tauri 2
- **Backend**: Rust (file engine: scanning, hashing, reading snippets, move/undo)
- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: SQLite for file index and AI metadata
- **AI Provider**: Anthropic Claude Haiku (API key provided by developer via .env)

## Related Repositories

- **Marketing Website**: Separate repo (TBD) - will host landing page, download links, privacy policy, changelog. This repo is desktop app only.

## Project Structure

```
ai-filesense/
├── src/                    # React frontend
│   ├── components/         # UI components (shadcn/ui based)
│   ├── i18n/               # Internationalization (en.json, es-MX.json)
│   ├── screens/            # App screens (Welcome, FolderSelection, Scanning, etc.)
│   ├── store/              # State management (appState.tsx)
│   ├── lib/                # Utilities (cn, etc.)
│   └── App.tsx             # Main app component with routing
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── ai.rs           # AI client (Anthropic Claude integration)
│   │   ├── commands.rs     # Tauri command handlers
│   │   ├── db.rs           # SQLite database operations
│   │   ├── scanner.rs      # File system scanning
│   │   ├── lib.rs          # Library entry point (.env loading)
│   │   └── main.rs         # Application entry point
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── .env                    # Environment variables (ANTHROPIC_API_KEY)
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
- `ai_metadata` - AI classification results (category, subcategory, tags, summary, confidence, suggested_folder)
- `content_snippets` - Extracted text for AI processing
- `move_history` - Transaction log for undo support
- `organization_plans` - Generated organization plans
- `plan_items` - Individual file moves within a plan

## Key Design Decisions

1. **Snippet caps**: Only extract first page/first N lines to keep AI calls fast
2. **Batch AI calls**: Send 20-100 files per request, not one-by-one
3. **Incremental indexing**: Only re-process changed files (hash + modified date check)
4. **Safe moves**: All file moves logged in transaction table for full undo support
5. **Staging mode**: Optional staging before final moves (recommended)
6. **No full drive scans by default**: Desktop + Documents + Downloads only

## AI Integration

- **API Key**: Loaded from `.env` file (`ANTHROPIC_API_KEY`) at startup in `lib.rs`
- **AI Client**: `src-tauri/src/ai.rs` - Anthropic Claude Haiku integration
- **Classification**: `src-tauri/src/commands.rs`: `classify_files` - calls AI for batch classification
- **AI receives**: file_id, filename, extension, size, created_at, modified_at, snippet
- **AI returns**: category, subcategory, tags, confidence, summary, suggested_folder

**Categories**: Documents, Images, Media, Spreadsheets, Code, Archives, Medical, Financial, Legal, Personal, Work, School, Other

**File Types Supported**: PDF (.pdf), Text (.txt), Word (.doc, .docx)

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
