# AI FileSense

> AI-powered local file organization for Windows

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)]()
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-orange.svg)](https://tauri.app)

AI FileSense uses artificial intelligence to understand and organize your files based on their actual content—not just filenames. Clean up your Desktop in minutes with AI-powered categorization.

## Features

- **AI-Powered Classification** — Uses Claude Haiku to categorize files by content (Medical, Financial, Legal, etc.)
- **Smart Organization** — AI suggests folder structures tailored to your files
- **Safe & Reversible** — Preview changes before moving, with full undo support
- **Privacy First** — All file scanning happens locally; only small snippets sent to AI
- **Bilingual** — Full English and Spanish (Mexico) support
- **Duplicate Detection** — Identifies duplicate files across folders

## Screenshots

*Coming soon*

## Installation

### Prerequisites

- Windows 10/11
- [Rust](https://rustup.rs/) (for development)
- [Node.js](https://nodejs.org/) 18+ (for development)

### Download

Download the latest release from the Releases page (coming soon).

### Build from Source

```bash
# Clone the repository
git clone <repository-url>
cd ai-filesense

# Install dependencies
npm install

# Create .env file with Anthropic API key
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

1. **Launch the app** — Click "Get Started"
2. **Select folders** — Desktop, Documents, and Downloads are enabled by default
3. **Choose file types** — PDF, Text, and/or Word documents
4. **Scan** — AI analyzes your files and categorizes them
5. **Choose a structure** — Pick from organization styles (Life Areas, Timeline, etc.)
6. **Preview & organize** — Review the plan before any files move
7. **Undo if needed** — Full undo support for all moves

## Tech Stack

| Component | Technology |
|-----------|------------|
| Desktop Shell | [Tauri 2](https://tauri.app) |
| Backend | Rust |
| Frontend | React + TypeScript + Vite |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS |
| Database | SQLite |
| AI | Anthropic Claude Haiku |

## Configuration

Data is stored locally at:

```
%APPDATA%/com.aifileense.app/
├── filesense.db    # SQLite database with file index and AI classifications
└── settings.json   # User preferences
```

## Privacy

- **Local scanning** — File metadata and content extraction happen entirely on your machine
- **Minimal data sent** — Only filenames, metadata, and small text snippets (first page/100 lines) are sent to the AI
- **No cloud storage** — Your files never leave your computer
- **Configurable scope** — You control which folders are scanned

## Roadmap

- [x] Duplicate file detection
- [x] AI-powered file classification
- [x] Bilingual support (EN/ES)
- [ ] Additional file type support (images, spreadsheets)
- [ ] Scheduled automatic organization
- [ ] macOS and Linux support
- [ ] Custom organization rules

## Contributing

This project is currently proprietary. Contributions are not being accepted at this time.

## License

This project is proprietary software. See the [LICENSE](LICENSE) file for details.

## Support

For support inquiries, please open an issue in the repository.

---

Built with Rust and React
