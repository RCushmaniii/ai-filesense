/**
 * Screen Exports - 10-Screen Workflow
 *
 * 1. WelcomeScreen - File type selection + app intro
 * 2. FolderSelectionScreen - Select locations to scan
 * 3. ScanningScreen - Progress during scan + AI analysis
 * 4. PersonalizationScreen - Q1-Q4 user preferences
 * 5. ResultsScreen - Read-only guardrail summary
 * 6. DetailedReviewScreen - Two-panel review & exclusions
 * 7. QuickFixesScreen - AI clarification questions
 * 8. ApplyingChangesScreen - Execution progress
 * 9. SuccessScreen - Completion stats
 * 10. DashboardScreen - Ongoing value
 *
 * Plus: SettingsScreen (modal, accessible from header)
 */

// Screen 1: Welcome (with file types)
export { WelcomeScreen } from './WelcomeScreen';

// Screen 2: Select Locations
export { FolderSelectionScreen } from './FolderSelectionScreen';

// Screen 3: Scanning Files
export { ScanningScreen } from './ScanningScreen';

// Screen 4: Personalization
export { PersonalizationScreen } from './PersonalizationScreen';

// Screen 5: Results Preview (read-only guardrail summary)
export { ResultsScreen } from './ResultsScreen';

// Screen 6: Review & Exclusions
export { DetailedReviewScreen } from './DetailedReviewScreen';

// Screen 7: Quick Clarifications
export { QuickFixesScreen } from './QuickFixesScreen';

// Screen 8: Applying Changes
export { ApplyingChangesScreen } from './ApplyingChangesScreen';

// Screen 9: Success
export { SuccessScreen } from './SuccessScreen';

// Screen 10: Dashboard
export { DashboardScreen } from './DashboardScreen';

// Settings (modal)
export { SettingsScreen } from './SettingsScreen';
