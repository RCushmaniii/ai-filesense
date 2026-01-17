# Testing Strategy

> **Document:** 14-testing-strategy.md  
> **Purpose:** Define testing approach optimized for AI Developer Assistants and human QA

---

## Overview

### Testing Philosophy

This testing strategy is designed for a hybrid team:
- **AI Developer Assistants** — Execute automated tests, generate test code, verify implementations
- **Human IT Manager** — Functional testing, UX validation, edge cases, real-world scenarios

### Test Pyramid

```
                    ┌─────────────────┐
                    │    Manual /     │  ← Human IT Manager
                    │   Functional    │     Real devices, UX validation
                    └────────┬────────┘
                             │
               ┌─────────────┴─────────────┐
               │      E2E / Integration    │  ← AI + Human
               │      (Playwright/Cypress) │     Critical user journeys
               └─────────────┬─────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │         Component / Visual          │  ← AI Automated
          │         (React Testing Library)     │     UI components, screenshots
          └──────────────────┬──────────────────┘
                             │
    ┌────────────────────────┴────────────────────────┐
    │                    Unit Tests                    │  ← AI Automated
    │                (Jest / Vitest)                   │     Functions, logic, utils
    └──────────────────────────────────────────────────┘
```

---

## Screen Size Compatibility

### Target Resolutions

The app must work on all common PC desktop and laptop screen sizes.

| Category | Resolution | Aspect Ratio | Notes |
|----------|------------|--------------|-------|
| Laptop Small | 1366 × 768 | 16:9 | Minimum supported |
| Laptop Medium | 1536 × 864 | 16:9 | Common scaling |
| Laptop Large | 1920 × 1080 | 16:9 | Full HD |
| Desktop | 2560 × 1440 | 16:9 | QHD |
| Desktop 4K | 3840 × 2160 | 16:9 | 4K (scaled) |
| Ultrawide | 2560 × 1080 | 21:9 | Ultrawide monitor |
| Portrait (rare) | 1080 × 1920 | 9:16 | Rotated monitor |

### Breakpoints

```css
/* Responsive breakpoints */
:root {
  --breakpoint-sm: 1366px;   /* Small laptops */
  --breakpoint-md: 1536px;   /* Medium laptops */
  --breakpoint-lg: 1920px;   /* Full HD */
  --breakpoint-xl: 2560px;   /* QHD and above */
}
```

### Screen Size Test Matrix

```typescript
// tests/config/screen-sizes.ts

export const SCREEN_SIZES = {
  // Minimum supported
  'laptop-small': { width: 1366, height: 768 },
  
  // Common laptop
  'laptop-medium': { width: 1536, height: 864 },
  
  // Full HD (baseline)
  'laptop-large': { width: 1920, height: 1080 },
  
  // QHD Desktop
  'desktop-qhd': { width: 2560, height: 1440 },
  
  // 4K (at 150% scaling = effective 2560x1440)
  'desktop-4k-scaled': { width: 2560, height: 1440 },
  
  // Ultrawide
  'ultrawide': { width: 2560, height: 1080 },
} as const;

export type ScreenSize = keyof typeof SCREEN_SIZES;
```

---

## AI-Friendly Test Specifications

### Design Principles for AI-Executable Tests

1. **Declarative over imperative** — Describe what, not how
2. **Structured data** — JSON/YAML specs AI can parse
3. **Clear assertions** — Expected outcomes explicitly stated
4. **Isolated tests** — No hidden dependencies
5. **Deterministic** — Same input → same output

### Test Specification Format

```yaml
# tests/specs/organize-flow.spec.yaml
# AI Developer Assistant can parse this and generate test code

test_suite: Organization Flow
description: Tests for the main document organization user journey

setup:
  fixtures:
    - name: sample_documents
      path: tests/fixtures/documents/
      files:
        - invoice_2025.pdf
        - contract_draft.docx
        - notes.txt
  mock_services:
    - name: classifier
      responses_file: tests/mocks/classifier-responses.json

tests:
  - id: ORG-001
    name: Complete organization flow - happy path
    priority: critical
    screen_sizes: [laptop-small, laptop-large, desktop-qhd]
    steps:
      - action: launch_app
        expect:
          screen: welcome
          elements_visible: [file_type_selector, continue_button]
      
      - action: click
        target: all_documents_option
        expect:
          state: selected
      
      - action: click
        target: continue_button
        expect:
          screen: location_selection
          elements_visible: [documents_checkbox, desktop_checkbox, downloads_checkbox]
      
      - action: click
        target: scan_now_button
        expect:
          screen: scan_progress
          elements_visible: [progress_bar, cancel_button]
      
      - action: wait_for
        condition: scan_complete
        timeout_seconds: 60
        expect:
          screen: results_preview
          data:
            document_count: { gte: 1 }
            folder_count: { gte: 1 }
      
      - action: click
        target: review_changes_button
        expect:
          screen: detailed_review
          elements_visible: [folder_tree, file_list, apply_button]
      
      - action: check
        target: confirmation_checkbox
        expect:
          state: checked
          button_enabled: apply_button
      
      - action: click
        target: apply_button
        expect:
          screen: applying_changes
          elements_visible: [progress_bar, stop_button]
      
      - action: wait_for
        condition: organization_complete
        timeout_seconds: 120
        expect:
          screen: success
          elements_visible: [success_icon, open_folder_button, undo_button]

    assertions:
      - type: files_moved
        from: fixtures.sample_documents
        to: organized_folder
      - type: activity_log_created
        entries: { gte: 1 }
      - type: no_errors_logged

  - id: ORG-002
    name: Cancel during scan
    priority: high
    steps:
      - action: launch_app
      - action: click
        target: continue_button
      - action: click
        target: scan_now_button
      - action: wait_for
        condition: progress_visible
      - action: click
        target: cancel_button
        expect:
          dialog: confirm_cancel
      - action: click
        target: confirm_yes
        expect:
          screen: welcome
          data:
            files_modified: 0
```

### AI Code Generation Prompt

When an AI Developer Assistant needs to implement tests, provide this context:

```markdown
## Test Implementation Instructions

You are implementing tests for Document Organizer, a Windows desktop app.

### Tech Stack
- Framework: Electron (or Tauri)
- Test Runner: Playwright (E2E), Vitest (unit)
- Component Testing: React Testing Library
- Visual Regression: Percy or Playwright screenshots

### File Structure
tests/
├── unit/           # Pure function tests
├── component/      # React component tests
├── integration/    # API + service tests
├── e2e/            # Full user journey tests
├── visual/         # Screenshot comparisons
├── fixtures/       # Test data
├── mocks/          # Mock responses
└── specs/          # YAML test specifications

### Code Style
- Use async/await, not callbacks
- One assertion per test when possible
- Descriptive test names: "should [action] when [condition]"
- Use data-testid attributes for selectors
- Clean up after each test

### Example Test
```typescript
import { test, expect } from '@playwright/test';
import { SCREEN_SIZES } from '../config/screen-sizes';

test.describe('Organization Flow', () => {
  for (const [sizeName, dimensions] of Object.entries(SCREEN_SIZES)) {
    test.describe(`at ${sizeName}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(dimensions);
      });

      test('should complete organization flow', async ({ page }) => {
        // Implementation based on ORG-001 spec
      });
    });
  }
});
```
```

---

## Unit Tests

### What to Unit Test

| Category | Examples | Priority |
|----------|----------|----------|
| Classification logic | Confidence calculation, folder mapping | Critical |
| File operations | Path validation, duplicate naming | Critical |
| Data transformations | JSON parsing, schema validation | High |
| Utility functions | formatFileSize, formatDate | Medium |
| State management | Reducers, selectors | High |

### Unit Test Specifications

```yaml
# tests/specs/unit/classification.spec.yaml

test_suite: Classification Logic
module: src/services/classifier.ts

tests:
  - id: UNIT-CLS-001
    name: normalizes folder names correctly
    function: normalizeFolderName
    cases:
      - input: "finance"
        expected: "Money"
      - input: "MEDICAL"
        expected: "Health"
      - input: "business"
        expected: "Work"
      - input: "Unknown Category"
        expected: "Unknown Category"

  - id: UNIT-CLS-002
    name: calculates confidence correctly
    function: calculateConfidence
    cases:
      - input:
          filename_match: true
          content_match: true
          entity_detected: true
        expected: { gte: 0.9 }
      - input:
          filename_match: true
          content_match: false
          entity_detected: false
        expected: { gte: 0.7, lt: 0.9 }
      - input:
          filename_match: false
          content_match: false
          entity_detected: false
        expected: { lt: 0.5 }

  - id: UNIT-CLS-003
    name: routes low confidence to Review
    function: determineFolder
    cases:
      - input:
          suggested_folder: "Work"
          confidence: 0.45
          threshold: 0.5
        expected: "Review"
      - input:
          suggested_folder: "Work"
          confidence: 0.75
          threshold: 0.5
        expected: "Work"
```

### Generated Unit Test Code

```typescript
// tests/unit/classifier.test.ts
// AI Developer Assistant generates this from spec

import { describe, it, expect } from 'vitest';
import { 
  normalizeFolderName, 
  calculateConfidence, 
  determineFolder 
} from '@/services/classifier';

describe('Classification Logic', () => {
  describe('normalizeFolderName', () => {
    it.each([
      ['finance', 'Money'],
      ['MEDICAL', 'Health'],
      ['business', 'Work'],
      ['Unknown Category', 'Unknown Category'],
    ])('normalizes "%s" to "%s"', (input, expected) => {
      expect(normalizeFolderName(input)).toBe(expected);
    });
  });

  describe('calculateConfidence', () => {
    it('returns >= 0.9 when all signals match', () => {
      const result = calculateConfidence({
        filename_match: true,
        content_match: true,
        entity_detected: true,
      });
      expect(result).toBeGreaterThanOrEqual(0.9);
    });

    it('returns 0.7-0.9 when only filename matches', () => {
      const result = calculateConfidence({
        filename_match: true,
        content_match: false,
        entity_detected: false,
      });
      expect(result).toBeGreaterThanOrEqual(0.7);
      expect(result).toBeLessThan(0.9);
    });

    it('returns < 0.5 when no signals match', () => {
      const result = calculateConfidence({
        filename_match: false,
        content_match: false,
        entity_detected: false,
      });
      expect(result).toBeLessThan(0.5);
    });
  });

  describe('determineFolder', () => {
    it('routes to Review when confidence below threshold', () => {
      const result = determineFolder({
        suggested_folder: 'Work',
        confidence: 0.45,
        threshold: 0.5,
      });
      expect(result).toBe('Review');
    });

    it('uses suggested folder when confidence above threshold', () => {
      const result = determineFolder({
        suggested_folder: 'Work',
        confidence: 0.75,
        threshold: 0.5,
      });
      expect(result).toBe('Work');
    });
  });
});
```

---

## Component Tests

### Component Test Specifications

```yaml
# tests/specs/component/file-list.spec.yaml

test_suite: FileList Component
component: src/components/FileList.tsx

tests:
  - id: COMP-FL-001
    name: renders file list correctly
    props:
      files:
        - id: "1"
          filename: "invoice.pdf"
          destination: "Money/Invoices"
          confidence: 0.95
          confidence_reason: "Invoice in filename"
        - id: "2"
          filename: "contract.docx"
          destination: "Legal"
          confidence: 0.72
          confidence_reason: "Contract keywords"
    assertions:
      - element: "[data-testid='file-item']"
        count: 2
      - element: "[data-testid='file-item-1'] .filename"
        text: "invoice.pdf"
      - element: "[data-testid='file-item-1'] .confidence"
        class_contains: "high"
      - element: "[data-testid='file-item-2'] .confidence"
        class_contains: "medium"

  - id: COMP-FL-002
    name: handles empty file list
    props:
      files: []
    assertions:
      - element: "[data-testid='empty-state']"
        visible: true
      - element: "[data-testid='file-item']"
        count: 0

  - id: COMP-FL-003
    name: triggers callback on folder change
    props:
      files:
        - id: "1"
          filename: "test.pdf"
          destination: "Work"
          confidence: 0.8
      onFolderChange: mock_function
    actions:
      - action: click
        target: "[data-testid='change-folder-1']"
      - action: select
        target: "[data-testid='folder-dropdown']"
        value: "Money"
    assertions:
      - mock: onFolderChange
        called_with: ["1", "Money"]
```

### Visual Regression Tests

```yaml
# tests/specs/visual/screens.spec.yaml

test_suite: Visual Regression
description: Screenshot comparisons across screen sizes

screens:
  - id: VIS-001
    name: Welcome screen
    route: /welcome
    screen_sizes: [laptop-small, laptop-large, desktop-qhd]
    states:
      - name: default
        setup: null
      - name: all_selected
        setup:
          click: "[data-testid='all-documents']"
      - name: advanced_expanded
        setup:
          click: "[data-testid='advanced-options']"
    threshold: 0.1  # 0.1% pixel difference allowed

  - id: VIS-002
    name: Results preview
    route: /preview
    screen_sizes: [laptop-small, laptop-large, desktop-qhd]
    mock_data: fixtures/preview-data.json
    states:
      - name: simple_mode
        setup:
          select_mode: simple
      - name: timeline_mode
        setup:
          select_mode: timeline
      - name: smart_groups_mode
        setup:
          select_mode: smart_groups

  - id: VIS-003
    name: Settings screens
    routes:
      - /settings/general
      - /settings/scanning
      - /settings/organization
      - /settings/auto-organize
      - /settings/notifications
      - /settings/privacy
      - /settings/advanced
    screen_sizes: [laptop-small, laptop-large]
```

---

## E2E Tests

### Critical User Journeys

```yaml
# tests/specs/e2e/journeys.spec.yaml

test_suite: Critical User Journeys
priority: P0 - Must pass before release

journeys:
  - id: E2E-001
    name: First-time user complete flow
    description: New user installs, onboards, and organizes documents
    estimated_duration: 5 minutes
    steps:
      - Launch app (simulates post-install)
      - Complete onboarding (grant permissions)
      - Run first scan
      - Preview results
      - Apply organization
      - Verify files moved correctly
      - Open organized folder
    success_criteria:
      - Onboarding completes without errors
      - Scan finds test fixtures
      - Files are moved to correct folders
      - Activity log is created
      - Undo functionality works

  - id: E2E-002
    name: Undo full organization
    description: User organizes then undoes everything
    steps:
      - Launch with pre-organized state
      - Go to Activity Log
      - Click "Undo All"
      - Confirm dialog
      - Verify files restored
    success_criteria:
      - All files return to original locations
      - Folders are cleaned up
      - Session marked as "rolled_back"

  - id: E2E-003
    name: Auto-organize conservative mode
    description: Background service suggests, user approves
    steps:
      - Enable auto-organize (conservative)
      - Copy test file to Downloads
      - Wait for suggestion notification
      - Click notification
      - Approve suggestion
      - Verify file moved
    success_criteria:
      - Notification appears within 60 seconds
      - File is suggested, not moved automatically
      - Approval moves file correctly

  - id: E2E-004
    name: Error recovery - file locked
    description: Graceful handling of locked files
    steps:
      - Open test file in another app
      - Start organization including that file
      - Verify error dialog appears
      - Choose "Skip"
      - Verify other files still organized
    success_criteria:
      - Error dialog shows correct message
      - Skip works without crashing
      - Other files are organized
      - Skipped file logged correctly

  - id: E2E-005
    name: Localization - Spanish
    description: Full flow in es-MX locale
    setup:
      locale: es-MX
    steps:
      - Launch app
      - Verify all text is Spanish
      - Complete organization
      - Check error messages (trigger intentionally)
      - Verify dates/numbers formatted correctly
    success_criteria:
      - No English text visible
      - All UI elements fit (no overflow)
      - Dates use Spanish format
```

### E2E Test Implementation

```typescript
// tests/e2e/journeys/first-time-user.spec.ts

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { launchElectron, cleanupTestFiles } from '../helpers';
import { SCREEN_SIZES } from '../config/screen-sizes';

test.describe('First-time user complete flow', () => {
  let app: ElectronApplication;
  let page: Page;

  test.beforeEach(async () => {
    await cleanupTestFiles();
    app = await launchElectron({ firstRun: true });
    page = await app.firstWindow();
  });

  test.afterEach(async () => {
    await app.close();
    await cleanupTestFiles();
  });

  // Test at multiple screen sizes
  for (const [sizeName, dimensions] of Object.entries(SCREEN_SIZES)) {
    test(`completes flow at ${sizeName} (${dimensions.width}x${dimensions.height})`, async () => {
      await page.setViewportSize(dimensions);

      // Step 1: Welcome screen
      await expect(page.getByTestId('welcome-screen')).toBeVisible();
      await expect(page.getByTestId('file-type-selector')).toBeVisible();
      
      // Verify no horizontal overflow
      const welcomeBox = await page.getByTestId('welcome-screen').boundingBox();
      expect(welcomeBox.width).toBeLessThanOrEqual(dimensions.width);

      // Step 2: Select all documents
      await page.getByTestId('all-documents').click();
      await page.getByTestId('continue-button').click();

      // Step 3: Location selection
      await expect(page.getByTestId('location-screen')).toBeVisible();
      await page.getByTestId('scan-now-button').click();

      // Step 4: Wait for scan
      await expect(page.getByTestId('scan-progress')).toBeVisible();
      await expect(page.getByTestId('results-preview')).toBeVisible({ timeout: 60000 });

      // Step 5: Verify results
      const docCount = await page.getByTestId('document-count').textContent();
      expect(parseInt(docCount)).toBeGreaterThan(0);

      // Step 6: Review and apply
      await page.getByTestId('review-changes-button').click();
      await expect(page.getByTestId('detailed-review')).toBeVisible();
      
      await page.getByTestId('confirmation-checkbox').check();
      await page.getByTestId('apply-button').click();

      // Step 7: Wait for completion
      await expect(page.getByTestId('success-screen')).toBeVisible({ timeout: 120000 });

      // Step 8: Verify files moved
      const filesOrganized = await page.getByTestId('files-organized-count').textContent();
      expect(parseInt(filesOrganized)).toBeGreaterThan(0);

      // Verify activity log created
      await page.getByTestId('view-log-button').click();
      await expect(page.getByTestId('activity-log')).toBeVisible();
      const logEntries = await page.getByTestId('log-entry').count();
      expect(logEntries).toBeGreaterThan(0);
    });
  }
});
```

---

## Human Functional Testing

### Test Plan for IT Manager

```markdown
# Human Functional Test Plan

## Tester Role
IT Manager performing functional, UX, and edge case testing on real hardware.

## Test Environment
- Windows 10 and Windows 11 machines
- Various screen sizes (laptop + external monitor)
- Real document collections (sanitized)
- Both locales (en-US, es-MX)

## Test Categories

### 1. Installation Testing (Priority: Critical)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-001 | Clean install | Download, run installer, complete | Installs without errors |
| HT-002 | Upgrade install | Install over existing version | Settings preserved, no data loss |
| HT-003 | Uninstall | Uninstall via Control Panel | Clean removal, optional data cleanup |
| HT-004 | Portable mode | Extract ZIP, run | Works without installation |

### 2. First-Run Experience (Priority: Critical)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-010 | Onboarding flow | Complete all onboarding steps | Smooth, no confusion |
| HT-011 | Skip onboarding | Skip optional steps | App still functions |
| HT-012 | Permission denied | Deny folder access | Graceful handling, clear message |
| HT-013 | First scan | Scan real Documents folder | Completes in reasonable time |

### 3. Core Organization (Priority: Critical)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-020 | Small batch | Organize 50 files | Fast, accurate |
| HT-021 | Large batch | Organize 2000+ files | Completes without hanging |
| HT-022 | Mixed file types | PDF + DOCX + TXT | All types handled |
| HT-023 | Deep folder structure | Source has 5+ levels | Handles gracefully |
| HT-024 | Long filenames | Files near MAX_PATH | Handles or reports clearly |
| HT-025 | Special characters | Files with ñ, ü, 中文 | Handled correctly |

### 4. Error Handling (Priority: High)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-030 | File locked | Open file in Word, organize | Clear error, skip option |
| HT-031 | Disk full | Fill destination drive | Clear message, recovery options |
| HT-032 | Network folder offline | Scan network drive, disconnect | Graceful failure |
| HT-033 | USB removed | Organize to USB, remove mid-process | Safe handling, undo works |

### 5. Undo Functionality (Priority: Critical)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-040 | Undo single file | Organize, undo one file | File returns, others stay |
| HT-041 | Undo full session | Organize, undo all | All files restored |
| HT-042 | Undo after app restart | Organize, close app, reopen, undo | Still works |
| HT-043 | Undo after 24 hours | Wait 24 hours, try undo | Still works |

### 6. Auto-Organize (Priority: High)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-050 | Conservative mode | Enable, add file to Downloads | Suggestion appears |
| HT-051 | Automatic mode | Enable, add file | File moves automatically |
| HT-052 | Service restart | Reboot computer | Service starts automatically |
| HT-053 | Quiet hours | Add file during quiet hours | No notification |

### 7. Localization (Priority: High)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-060 | Spanish locale | Set Windows to es-MX, launch | All UI in Spanish |
| HT-061 | Language switch | Change language in settings | Immediate switch |
| HT-062 | Spanish long text | Review all screens | No text overflow |
| HT-063 | Date formatting | Check dates in both locales | Correct format |

### 8. Screen Sizes (Priority: High)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-070 | 1366x768 laptop | Test all screens | No horizontal scroll, all usable |
| HT-071 | 1920x1080 laptop | Test all screens | Good use of space |
| HT-072 | External 4K monitor | Test at 150% scaling | Crisp, no layout issues |
| HT-073 | Ultrawide monitor | Test at 2560x1080 | Layout adapts, no stretching |
| HT-074 | Dual monitor | Move app between monitors | Window adapts |

### 9. Performance (Priority: Medium)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-080 | Memory usage | Monitor during large scan | < 500 MB |
| HT-081 | CPU usage | Monitor during organization | < 50% sustained |
| HT-082 | Startup time | Measure cold start | < 5 seconds |
| HT-083 | Responsiveness | Click buttons during processing | UI stays responsive |

### 10. Edge Cases (Priority: Medium)
| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| HT-090 | Empty folders | Scan folder with no documents | Clear message |
| HT-091 | Duplicate filenames | Multiple "invoice.pdf" | Handles with rename |
| HT-092 | Read-only files | Include read-only files | Skips or reports |
| HT-093 | Symbolic links | Folder contains symlinks | Follows or skips safely |
| HT-094 | OneDrive folder | Scan OneDrive-synced folder | Works with cloud files |
```

### Test Result Template

```markdown
# Test Execution Report

**Tester:** [Name]
**Date:** [Date]
**App Version:** [Version]
**Test Environment:**
- OS: Windows 11 Pro 23H2
- Screen: 1920x1080 + 2560x1440 external
- RAM: 16 GB
- Locale: en-US / es-MX

## Results Summary
| Category | Pass | Fail | Blocked | Not Run |
|----------|------|------|---------|---------|
| Installation | 4 | 0 | 0 | 0 |
| First-Run | 4 | 0 | 0 | 0 |
| Core Organization | 6 | 0 | 0 | 0 |
| ... | ... | ... | ... | ... |

## Failed Tests
| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| HT-025 | Chinese characters display as boxes | Medium | Font issue |

## Observations
- [General observations about UX, performance, etc.]

## Recommendations
- [Suggestions for improvement]
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: unit-test-results
          path: coverage/

  component-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:component
      - uses: actions/upload-artifact@v4
        with:
          name: component-coverage
          path: coverage/

  visual-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:visual
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diff
          path: tests/visual/__diff__/

  e2e-tests:
    runs-on: windows-latest
    strategy:
      matrix:
        screen-size: [laptop-small, laptop-large, desktop-qhd]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e -- --project=${{ matrix.screen-size }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-results-${{ matrix.screen-size }}
          path: test-results/

  localization-tests:
    runs-on: windows-latest
    strategy:
      matrix:
        locale: [en-US, es-MX]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:i18n -- --locale=${{ matrix.locale }}
```

### Test Commands

```json
// package.json scripts
{
  "scripts": {
    "test": "npm run test:unit && npm run test:component",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:component": "vitest run --config vitest.component.config.ts",
    "test:e2e": "playwright test --config playwright.config.ts",
    "test:visual": "playwright test --config playwright.visual.config.ts",
    "test:i18n": "vitest run tests/i18n/",
    "test:all": "npm run test && npm run test:e2e && npm run test:visual",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Test Data Management

### Fixtures Structure

```
tests/fixtures/
├── documents/
│   ├── invoices/
│   │   ├── invoice_2025_01.pdf
│   │   ├── invoice_2025_02.pdf
│   │   └── factura_mexico.pdf      # Spanish invoice
│   ├── contracts/
│   │   ├── contract_draft.docx
│   │   └── contrato_arrendamiento.docx
│   ├── misc/
│   │   ├── notes.txt
│   │   ├── readme.txt
│   │   └── archivo_con_ñ.txt       # Special characters
│   └── edge_cases/
│       ├── empty_file.pdf
│       ├── very_long_filename_that_approaches_the_windows_max_path_limit.docx
│       └── 文件.pdf                 # Chinese filename
├── mocks/
│   ├── classifier-responses.json
│   └── scan-results.json
└── expected/
    ├── organized-structure.json
    └── activity-log-sample.json
```

### Fixture Generation Script

```typescript
// scripts/generate-fixtures.ts
// AI Developer Assistant can run this to create test data

import { faker } from '@faker-js/faker';
import { generatePDF, generateDOCX } from './generators';

async function generateTestFixtures() {
  const fixtures = [
    // Invoices
    ...Array(10).fill(null).map((_, i) => ({
      type: 'invoice',
      filename: `invoice_${2025}_${String(i + 1).padStart(2, '0')}.pdf`,
      content: {
        title: 'INVOICE',
        amount: faker.commerce.price({ min: 100, max: 10000 }),
        date: faker.date.recent(),
      }
    })),
    
    // Contracts
    ...Array(5).fill(null).map((_, i) => ({
      type: 'contract',
      filename: `contract_${faker.word.noun()}.docx`,
      content: {
        title: 'AGREEMENT',
        parties: [faker.company.name(), faker.company.name()],
      }
    })),
    
    // Spanish documents
    {
      type: 'invoice',
      filename: 'factura_2025.pdf',
      content: {
        title: 'FACTURA',
        amount: '15,000.00 MXN',
        rfc: 'XAXX010101000',
      }
    },
  ];

  for (const fixture of fixtures) {
    if (fixture.filename.endsWith('.pdf')) {
      await generatePDF(fixture);
    } else {
      await generateDOCX(fixture);
    }
  }
}
```

---

## Summary

| Test Type | Owner | Automation | Priority |
|-----------|-------|------------|----------|
| Unit Tests | AI | 100% | Critical |
| Component Tests | AI | 100% | Critical |
| Visual Regression | AI | 100% | High |
| E2E Tests | AI + Human | 90% | Critical |
| Functional Tests | Human | 0% (manual) | Critical |
| Screen Size Tests | AI + Human | 80% | High |
| Localization Tests | AI + Human | 70% | High |
| Performance Tests | AI | 80% | Medium |
| Edge Case Tests | Human | 20% | Medium |

### AI Developer Assistant Checklist

When implementing tests, the AI should:
- [ ] Read YAML spec files in `tests/specs/`
- [ ] Generate corresponding test code
- [ ] Use data-testid selectors
- [ ] Test all screen sizes in matrix
- [ ] Include both locales
- [ ] Clean up test data after runs
- [ ] Report coverage metrics
