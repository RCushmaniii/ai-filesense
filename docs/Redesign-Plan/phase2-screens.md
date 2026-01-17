# Phase 2: Core User Journey
> **Document:** phases/phase2-screens.md  
> **Priority:** CRITICAL  
> **Estimated Effort:** 5-7 days  
> **Dependencies:** Phase 1  
> **Blocks:** Phase 3

---

## Objective

Implement all 9 screens of the user journey per specification doc 06, with proper navigation flow and personalization.

---

## Screen Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] Welcome ──> [2] Location ──> [3] Scan Progress            │
│                                         │                       │
│                                         ▼                       │
│                    [6] Quick Fixes <── [4] Results Preview     │
│                         │                   │                   │
│                         ▼                   ▼                   │
│                    [5] Detailed Review ────────┐                │
│                         │                      │                │
│                         ▼                      ▼                │
│                    [7] Applying Changes ◄──────┘                │
│                         │                                       │
│                         ▼                                       │
│                    [8] Success ──> [9] Dashboard                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen Implementation Summary

| # | Screen | File | Status | Priority |
|---|--------|------|--------|----------|
| 1 | Welcome | `WelcomeScreen.tsx` | Create | Critical |
| 2 | Location Selection | `LocationSelectionScreen.tsx` | Refactor | Critical |
| 3 | Scan Progress | `ScanProgressScreen.tsx` | Enhance | Critical |
| 4 | Results Preview | `ResultsPreviewScreen.tsx` | Enhance | Critical |
| 5 | Detailed Review | `DetailedReviewScreen.tsx` | Create | Critical |
| 6 | Quick Fixes | `QuickFixesScreen.tsx` | Create | High |
| 7 | Applying Changes | `ApplyingChangesScreen.tsx` | Enhance | Critical |
| 8 | Success | `SuccessScreen.tsx` | Enhance | Critical |
| 9 | Dashboard | `DashboardScreen.tsx` | Create | High |

---

## Screen 1: Welcome / File Type Selection

**File:** `src/screens/WelcomeScreen.tsx`

### Purpose
First decision point. User chooses what to organize. Establishes trust immediately.

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│                         [App Logo]                             │
│                                                                │
│              Let's get your documents organized                │
│                                                                │
│     Pick what you want to organize—you can always do more      │
│                         later.                                 │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   PDF    │  │   Word   │  │   Text   │  │   All    │       │
│  │  [icon]  │  │  [icon]  │  │  [icon]  │  │  [icon]  │       │
│  │  1,234   │  │   567    │  │   89     │  │  1,890   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                │
│     🔒 Your files stay on your computer.                       │
│        Nothing moves until you approve.                        │
│                                                                │
│                    ▼ Advanced options                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  □ Include spreadsheets (.xlsx, .csv)                   │  │
│  │  □ Include presentations (.pptx)                         │  │
│  │  □ Include images with text (OCR) [Beta]                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│                     [ Continue → ]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Implementation

```tsx
// src/screens/WelcomeScreen.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useTranslation } from 'react-i18next';
import { Lock, FileText, FileSpreadsheet, Presentation, Image } from 'lucide-react';

interface FileTypeCounts {
  pdf: number;
  word: number;
  text: number;
  spreadsheet: number;
  presentation: number;
  image: number;
  total: number;
}

type FileTypeSelection = 'pdf' | 'word' | 'text' | 'all';

export function WelcomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [counts, setCounts] = useState<FileTypeCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<FileTypeSelection>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    includeSpreadsheets: false,
    includePresentations: false,
    includeImagesOcr: false,
  });

  useEffect(() => {
    // Quick scan for file counts (background, non-blocking)
    invoke<FileTypeCounts>('get_file_type_counts')
      .then(setCounts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleContinue = () => {
    // Save selections to app state
    const config = {
      fileTypes: selectedType === 'all' 
        ? ['pdf', 'word', 'text'] 
        : [selectedType],
      ...advancedOptions,
    };
    
    // Navigate with config
    navigate('/location', { state: { config } });
  };

  const getCountForType = (type: FileTypeSelection): number => {
    if (!counts) return 0;
    switch (type) {
      case 'pdf': return counts.pdf;
      case 'word': return counts.word;
      case 'text': return counts.text;
      case 'all': return counts.total;
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-header">
        <img src="/logo.svg" alt="AI FileSense" className="app-logo" />
        <h1>{t('welcome.title')}</h1>
        <p className="subtitle">{t('welcome.subtitle')}</p>
      </div>

      <div className="file-type-grid">
        {(['pdf', 'word', 'text', 'all'] as const).map((type) => (
          <button
            key={type}
            className={`file-type-card ${selectedType === type ? 'selected' : ''}`}
            onClick={() => setSelectedType(type)}
          >
            <FileTypeIcon type={type} />
            <span className="type-label">{t(`welcome.fileTypes.${type}`)}</span>
            <span className="type-count">
              {loading ? '...' : getCountForType(type).toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      <div className="trust-statement">
        <Lock size={16} />
        <span>{t('welcome.trustLine')}</span>
      </div>

      <button 
        className="advanced-toggle"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? '▲' : '▼'} {t('welcome.advanced')}
      </button>

      {showAdvanced && (
        <div className="advanced-options">
          <label>
            <input
              type="checkbox"
              checked={advancedOptions.includeSpreadsheets}
              onChange={(e) => setAdvancedOptions(prev => ({
                ...prev,
                includeSpreadsheets: e.target.checked
              }))}
            />
            {t('welcome.includeSpreadsheets')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={advancedOptions.includePresentations}
              onChange={(e) => setAdvancedOptions(prev => ({
                ...prev,
                includePresentations: e.target.checked
              }))}
            />
            {t('welcome.includePresentations')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={advancedOptions.includeImagesOcr}
              onChange={(e) => setAdvancedOptions(prev => ({
                ...prev,
                includeImagesOcr: e.target.checked
              }))}
            />
            {t('welcome.includeImagesOcr')} <span className="beta-badge">Beta</span>
          </label>
        </div>
      )}

      <button 
        className="btn-primary"
        onClick={handleContinue}
        disabled={loading}
      >
        {t('welcome.continue')}
      </button>
    </div>
  );
}

function FileTypeIcon({ type }: { type: FileTypeSelection }) {
  switch (type) {
    case 'pdf': return <FileText className="icon-pdf" />;
    case 'word': return <FileText className="icon-word" />;
    case 'text': return <FileText className="icon-text" />;
    case 'all': return <FileText className="icon-all" />;
  }
}
```

### i18n Keys

```json
{
  "welcome": {
    "title": "Let's get your documents organized",
    "subtitle": "Pick what you want to organize—you can always do more later.",
    "trustLine": "Your files stay on your computer. Nothing moves until you approve.",
    "fileTypes": {
      "pdf": "PDF Documents",
      "word": "Word Documents",
      "text": "Text Files",
      "all": "All Documents"
    },
    "advanced": "Advanced options",
    "includeSpreadsheets": "Include spreadsheets (.xlsx, .csv)",
    "includePresentations": "Include presentations (.pptx)",
    "includeImagesOcr": "Include images with text (OCR)",
    "continue": "Continue"
  }
}
```

### Acceptance Criteria
- [ ] Logo and headline displayed
- [ ] File type buttons show counts (async load)
- [ ] Selected type highlighted
- [ ] Trust statement visible
- [ ] Advanced options collapse/expand
- [ ] Continue navigates to Location screen
- [ ] Works at 1366×768 minimum

---

## Screen 2: Location Selection

**File:** `src/screens/LocationSelectionScreen.tsx`

### Purpose
User selects which folders to scan. Shows estimated file counts per location.

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│  [← Back]                                                      │
│                                                                │
│              Where are your documents?                         │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ☑ Documents                                 1,234 files │  │
│  │  ☐ Desktop                                     567 files │  │
│  │  ☑ Downloads                                   890 files │  │
│  │  ☐ OneDrive                                    456 files │  │
│  │                                                          │  │
│  │  [+ Add folder...]                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│     ☑ Include subfolders                                       │
│                                                                │
│     ─────────────────────────────────────────────────────     │
│     Estimated: 2,124 documents to organize                     │
│     ─────────────────────────────────────────────────────     │
│                                                                │
│                     [ Scan Now → ]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Implementation

```tsx
// src/screens/LocationSelectionScreen.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FolderPlus, Folder } from 'lucide-react';

interface FolderInfo {
  path: string;
  name: string;
  fileCount: number;
  selected: boolean;
}

interface LocationConfig {
  fileTypes: string[];
  includeSpreadsheets: boolean;
  includePresentations: boolean;
  includeImagesOcr: boolean;
}

export function LocationSelectionScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state?.config as LocationConfig;

  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get default folders with counts
    invoke<FolderInfo[]>('get_default_scan_locations', { 
      fileTypes: config?.fileTypes ?? ['pdf', 'word', 'text']
    })
      .then(setFolders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config]);

  const toggleFolder = (index: number) => {
    setFolders(prev => prev.map((f, i) => 
      i === index ? { ...f, selected: !f.selected } : f
    ));
  };

  const addFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: t('location.addFolderTitle'),
    });

    if (selected && typeof selected === 'string') {
      const count = await invoke<number>('count_files_in_folder', {
        path: selected,
        fileTypes: config?.fileTypes ?? ['pdf', 'word', 'text'],
      });

      setFolders(prev => [...prev, {
        path: selected,
        name: selected.split(/[/\\]/).pop() ?? selected,
        fileCount: count,
        selected: true,
      }]);
    }
  };

  const totalEstimate = folders
    .filter(f => f.selected)
    .reduce((sum, f) => sum + f.fileCount, 0);

  const handleScan = () => {
    const selectedPaths = folders.filter(f => f.selected).map(f => f.path);
    
    navigate('/scan', {
      state: {
        config,
        paths: selectedPaths,
        includeSubfolders,
      }
    });
  };

  return (
    <div className="location-screen">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        {t('common.back')}
      </button>

      <h1>{t('location.title')}</h1>

      <div className="folder-list">
        {loading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : (
          folders.map((folder, index) => (
            <label key={folder.path} className="folder-item">
              <input
                type="checkbox"
                checked={folder.selected}
                onChange={() => toggleFolder(index)}
              />
              <Folder size={20} />
              <span className="folder-name">{folder.name}</span>
              <span className="folder-count">
                {folder.fileCount.toLocaleString()} {t('location.files')}
              </span>
            </label>
          ))
        )}

        <button className="add-folder-btn" onClick={addFolder}>
          <FolderPlus size={20} />
          {t('location.addFolder')}
        </button>
      </div>

      <label className="subfolder-toggle">
        <input
          type="checkbox"
          checked={includeSubfolders}
          onChange={(e) => setIncludeSubfolders(e.target.checked)}
        />
        {t('location.includeSubfolders')}
      </label>

      <div className="estimate-bar">
        <span>{t('location.estimated')}: </span>
        <strong>{totalEstimate.toLocaleString()}</strong>
        <span> {t('location.documentsToOrganize')}</span>
      </div>

      <button
        className="btn-primary"
        onClick={handleScan}
        disabled={totalEstimate === 0}
      >
        {t('location.scanNow')}
      </button>
    </div>
  );
}
```

### i18n Keys

```json
{
  "location": {
    "title": "Where are your documents?",
    "files": "files",
    "addFolder": "Add folder...",
    "addFolderTitle": "Select a folder to scan",
    "includeSubfolders": "Include subfolders",
    "estimated": "Estimated",
    "documentsToOrganize": "documents to organize",
    "scanNow": "Scan Now"
  }
}
```

### Acceptance Criteria
- [ ] Default locations shown with file counts
- [ ] Checkboxes toggle selection
- [ ] Add folder opens native dialog
- [ ] Subfolder toggle works
- [ ] Total estimate updates dynamically
- [ ] Scan button disabled if no files selected
- [ ] Back button returns to Welcome

---

## Screen 3: Scan Progress + Personalization

**File:** `src/screens/ScanProgressScreen.tsx`

### Purpose
Show scanning progress while collecting personalization answers (Q1/Q2/Q3).

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│            Analyzing your documents...                         │
│                                                                │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░  45%           │
│                                                                │
│            Analyzed 450 of 1,000 documents                     │
│                                                                │
│  ─────────────────────────────────────────────────────────────│
│                                                                │
│     While I work, help me personalize your organization:       │
│                                                                │
│     Q1: What do you use this computer for?                     │
│                                                                │
│     [Parent/Family] [Student] [Teacher] [Office Worker]        │
│     [Freelancer] [Small Business] [Retired] [Creative]         │
│                                                                │
│     Q2: How do you usually look for files?                     │
│                                                                │
│     [By topic] [By time] [By project] [I don't know]          │
│                                                                │
│     Q3: How automatic should I be?                             │
│                                                                │
│     [Safe] [Balanced ✓] [Aggressive]                          │
│                                                                │
│                         [Skip →]                               │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Implementation

```tsx
// src/screens/ScanProgressScreen.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';

interface ScanProgress {
  scanned: number;
  total: number;
  currentFile: string;
}

interface ScanConfig {
  paths: string[];
  includeSubfolders: boolean;
  fileTypes: string[];
}

type UserType = 
  | 'parent' | 'student' | 'teacher' | 'office' 
  | 'freelancer' | 'business' | 'retired' | 'creative';

type LookupStyle = 'topic' | 'time' | 'project' | 'unknown';
type AutomationLevel = 'safe' | 'balanced' | 'aggressive';

interface Personalization {
  userType: UserType | null;
  lookupStyle: LookupStyle | null;
  automationLevel: AutomationLevel;
}

export function ScanProgressScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const config = location.state as ScanConfig;

  const [progress, setProgress] = useState<ScanProgress>({
    scanned: 0,
    total: 0,
    currentFile: '',
  });
  const [scanComplete, setScanComplete] = useState(false);
  const [personalization, setPersonalization] = useState<Personalization>({
    userType: null,
    lookupStyle: null,
    automationLevel: 'balanced',
  });

  // Start scan on mount
  useEffect(() => {
    let unlisten: UnlistenFn;

    const startScan = async () => {
      // Listen for progress events
      unlisten = await listen<ScanProgress>('scan-progress', (event) => {
        setProgress(event.payload);
      });

      // Start the scan
      try {
        await invoke('start_scan', {
          paths: config.paths,
          includeSubfolders: config.includeSubfolders,
          fileTypes: config.fileTypes,
        });
        setScanComplete(true);
      } catch (error) {
        console.error('Scan failed:', error);
        // Handle error - navigate to error screen or show message
      }
    };

    startScan();

    return () => {
      if (unlisten) unlisten();
    };
  }, [config]);

  // Navigate when scan completes and questions answered (or skipped)
  useEffect(() => {
    if (scanComplete) {
      navigate('/results', { state: { personalization } });
    }
  }, [scanComplete, personalization, navigate]);

  const progressPercent = progress.total > 0 
    ? Math.round((progress.scanned / progress.total) * 100) 
    : 0;

  const handleSkip = () => {
    // Use defaults and continue
    navigate('/results', { 
      state: { 
        personalization: {
          userType: null,
          lookupStyle: null,
          automationLevel: 'balanced',
        }
      }
    });
  };

  const userTypes: UserType[] = [
    'parent', 'student', 'teacher', 'office',
    'freelancer', 'business', 'retired', 'creative'
  ];

  const lookupStyles: LookupStyle[] = ['topic', 'time', 'project', 'unknown'];
  const automationLevels: AutomationLevel[] = ['safe', 'balanced', 'aggressive'];

  return (
    <div className="scan-progress-screen">
      <h1>{t('scan.analyzing')}</h1>

      <div className="progress-section">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="progress-percent">{progressPercent}%</span>
        
        <p className="progress-text">
          {t('scan.analyzed')} {progress.scanned.toLocaleString()} {t('scan.of')}{' '}
          {progress.total.toLocaleString()} {t('scan.documents')}
        </p>
      </div>

      <hr className="divider" />

      <div className="personalization-section">
        <p className="personalization-intro">{t('scan.personalize')}</p>

        {/* Q1: User Type */}
        <div className="question">
          <p className="question-label">{t('scan.q1.label')}</p>
          <div className="choice-grid">
            {userTypes.map((type) => (
              <button
                key={type}
                className={`choice-btn ${personalization.userType === type ? 'selected' : ''}`}
                onClick={() => setPersonalization(prev => ({ ...prev, userType: type }))}
              >
                {t(`scan.q1.options.${type}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Q2: Lookup Style */}
        <div className="question">
          <p className="question-label">{t('scan.q2.label')}</p>
          <div className="choice-row">
            {lookupStyles.map((style) => (
              <button
                key={style}
                className={`choice-btn ${personalization.lookupStyle === style ? 'selected' : ''}`}
                onClick={() => setPersonalization(prev => ({ ...prev, lookupStyle: style }))}
              >
                {t(`scan.q2.options.${style}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Q3: Automation Level */}
        <div className="question">
          <p className="question-label">{t('scan.q3.label')}</p>
          <div className="choice-row automation-choices">
            {automationLevels.map((level) => (
              <button
                key={level}
                className={`choice-btn automation-btn ${personalization.automationLevel === level ? 'selected' : ''}`}
                onClick={() => setPersonalization(prev => ({ ...prev, automationLevel: level }))}
              >
                {t(`scan.q3.options.${level}`)}
                {level === 'balanced' && <span className="recommended">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="skip-btn" onClick={handleSkip}>
        {t('scan.skip')}
      </button>
    </div>
  );
}
```

### i18n Keys

```json
{
  "scan": {
    "analyzing": "Analyzing your documents...",
    "analyzed": "Analyzed",
    "of": "of",
    "documents": "documents",
    "personalize": "While I work, help me personalize your organization:",
    "skip": "Skip",
    "q1": {
      "label": "What do you use this computer for?",
      "options": {
        "parent": "Parent/Family",
        "student": "Student",
        "teacher": "Teacher",
        "office": "Office Worker",
        "freelancer": "Freelancer",
        "business": "Small Business",
        "retired": "Retired",
        "creative": "Creative"
      }
    },
    "q2": {
      "label": "How do you usually look for files?",
      "options": {
        "topic": "By topic",
        "time": "By time",
        "project": "By project",
        "unknown": "I don't know"
      }
    },
    "q3": {
      "label": "How automatic should I be?",
      "options": {
        "safe": "Safe",
        "balanced": "Balanced",
        "aggressive": "Aggressive"
      }
    }
  }
}
```

### Decision Logic (Q1/Q2/Q3 → Mode)

```typescript
// src/utils/modeSelection.ts
import { Personalization } from '../types';

export type OrganizationMode = 'simple' | 'timeline' | 'smart_groups';

export function selectMode(p: Personalization): OrganizationMode {
  // Q2 is the primary driver
  if (p.lookupStyle === 'time') return 'timeline';
  if (p.lookupStyle === 'project') return 'smart_groups';
  
  // Q1 can influence if Q2 is 'topic' or 'unknown'
  if (p.userType === 'freelancer' || p.userType === 'business') {
    return 'smart_groups';
  }
  
  // Default
  return 'simple';
}

export function getConfidenceThreshold(level: string): number {
  switch (level) {
    case 'safe': return 0.80;
    case 'balanced': return 0.70;
    case 'aggressive': return 0.55;
    default: return 0.70;
  }
}
```

### Acceptance Criteria
- [ ] Progress bar animates smoothly
- [ ] File count updates in real-time
- [ ] All 8 user types selectable
- [ ] All 4 lookup styles selectable
- [ ] All 3 automation levels selectable
- [ ] Balanced is pre-selected default
- [ ] Skip button navigates to results
- [ ] Auto-navigates when scan completes

---

## Screen 4: Results Preview

**File:** `src/screens/ResultsPreviewScreen.tsx`

### Purpose
Show AI's organization plan at a glance. Let user select organization mode.

### Layout
```
┌────────────────────────────────────────────────────────────────┐
│  [← Back]                                                      │
│                                                                │
│     ┌────────────────────────────────────────────────────┐    │
│     │  Ready to organize                                 │    │
│     │  1,234 documents into 6 folders                    │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                │
│     Work     ████████████████████████████████████  456        │
│     Money    ██████████████████████████  312                  │
│     Home     ████████████████  198                            │
│     Health   ██████████  123                                  │
│     Legal    █████  67                                        │
│     Review   ████  78                                         │
│                                                                │
│     ─────────────────────────────────────────────────────     │
│                                                                │
│     Organization Mode:                                         │
│     [● Simple] [○ Timeline] [○ Smart Groups]                  │
│                                                                │
│     "Based on your files, Simple mode will work best.         │
│      Most of your documents are personal records."            │
│                                                                │
│     ⚠️ 78 documents need review (low confidence)               │
│                                                                │
│                   [ Review Changes → ]                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Implementation

```tsx
// src/screens/ResultsPreviewScreen.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Category, CATEGORY_META } from '@/types/category';
import { selectMode, OrganizationMode } from '@/utils/modeSelection';

interface OrganizationPlan {
  totalFiles: number;
  folderCount: number;
  folderBreakdown: { category: Category; count: number }[];
  reviewCount: number;
  aiExplanation: string;
}

interface Personalization {
  userType: string | null;
  lookupStyle: string | null;
  automationLevel: string;
}

export function ResultsPreviewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const personalization = location.state?.personalization as Personalization;

  const [plan, setPlan] = useState<OrganizationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<OrganizationMode>(() =>
    selectMode(personalization)
  );

  useEffect(() => {
    invoke<OrganizationPlan>('get_organization_plan', {
      mode: selectedMode,
      automationLevel: personalization?.automationLevel ?? 'balanced',
    })
      .then(setPlan)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedMode, personalization]);

  const handleReview = () => {
    navigate('/review', {
      state: {
        mode: selectedMode,
        personalization,
      },
    });
  };

  if (loading || !plan) {
    return <div className="loading-screen">{t('common.loading')}</div>;
  }

  const maxCount = Math.max(...plan.folderBreakdown.map((f) => f.count));

  return (
    <div className="results-preview-screen">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        {t('common.back')}
      </button>

      <div className="summary-card">
        <h2>{t('results.ready')}</h2>
        <p>
          <strong>{plan.totalFiles.toLocaleString()}</strong> {t('results.documentsInto')}{' '}
          <strong>{plan.folderCount}</strong> {t('results.folders')}
        </p>
      </div>

      <div className="folder-breakdown">
        {plan.folderBreakdown.map(({ category, count }) => (
          <div key={category} className="folder-bar">
            <span className="folder-name">{category}</span>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  backgroundColor: CATEGORY_META[category].color,
                }}
              />
            </div>
            <span className="folder-count">{count.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div className="mode-selector">
        <p className="mode-label">{t('results.modeLabel')}</p>
        <div className="mode-options">
          {(['simple', 'timeline', 'smart_groups'] as const).map((mode) => (
            <button
              key={mode}
              className={`mode-btn ${selectedMode === mode ? 'selected' : ''}`}
              onClick={() => setSelectedMode(mode)}
            >
              {t(`results.modes.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="ai-explanation">"{plan.aiExplanation}"</p>

      {plan.reviewCount > 0 && (
        <div className="review-notice">
          <AlertTriangle size={16} />
          <span>
            {plan.reviewCount} {t('results.needsReview')}
          </span>
        </div>
      )}

      <button className="btn-primary" onClick={handleReview}>
        {t('results.reviewChanges')}
      </button>
    </div>
  );
}
```

### i18n Keys

```json
{
  "results": {
    "ready": "Ready to organize",
    "documentsInto": "documents into",
    "folders": "folders",
    "modeLabel": "Organization Mode:",
    "modes": {
      "simple": "Simple",
      "timeline": "Timeline",
      "smart_groups": "Smart Groups"
    },
    "needsReview": "documents need review (low confidence)",
    "reviewChanges": "Review Changes"
  }
}
```

### Acceptance Criteria
- [ ] Summary card shows totals
- [ ] Bar chart displays folder breakdown
- [ ] Bars colored per CATEGORY_META
- [ ] Mode selector switches modes
- [ ] AI explanation text displayed
- [ ] Review count warning shown if > 0
- [ ] Mode change triggers plan recalculation

---

## Screens 5-9: Summary

Due to document length, the remaining screens (5-9) follow the same pattern. Key points for each:

### Screen 5: Detailed Review
- Two-panel layout: folder tree (left), file list (right)
- Per-file confidence indicators
- Dropdown to change folder assignment
- Confirmation checkbox before proceeding

### Screen 6: Quick Fixes
- Max 5 disambiguation questions
- Entity card with sample files
- Choice buttons for context
- Skip all option

### Screen 7: Applying Changes
- Progress bar with current file name
- Stop button with confirmation
- Safety checklist display
- Real-time operation count

### Screen 8: Success
- Stats: folders created, docs organized, time saved
- Open folder button (primary)
- Undo, View Log, Auto-Organize buttons
- Review folder tip if items exist

### Screen 9: Dashboard
- Review folder card with urgency
- Folder grid with counts
- Quick actions row
- Auto-organize status

---

## Phase 2 Completion Checklist

```
[ ] Screen 1: WelcomeScreen implemented
[ ] Screen 2: LocationSelectionScreen implemented
[ ] Screen 3: ScanProgressScreen with Q1/Q2/Q3
[ ] Screen 4: ResultsPreviewScreen with bar chart
[ ] Screen 5: DetailedReviewScreen with two-panel layout
[ ] Screen 6: QuickFixesScreen (max 5 questions)
[ ] Screen 7: ApplyingChangesScreen with stop button
[ ] Screen 8: SuccessScreen with stats
[ ] Screen 9: DashboardScreen
[ ] Navigation flow matches spec
[ ] All i18n keys defined (en-US)
[ ] All i18n keys defined (es-MX)
[ ] All screens work at 1366×768
[ ] Mode selection affects organization plan
```

---

## Handoff to Phase 3

Once Phase 2 is complete:
1. Commit: `feat: Phase 2 - All 9 screens implemented`
2. Tag: `v0.3.0-phase2`
3. Update checklist
4. Proceed to `phases/phase3-activity-log.md`
