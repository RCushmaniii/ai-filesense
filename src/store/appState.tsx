import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Re-export category types for convenience
export type { Category, DocumentType, Classification, ConfidenceLevel } from '@/types/category';
export { CATEGORIES, DOCUMENT_TYPES, CATEGORY_META, getConfidenceLevel, shouldRouteToReview, normalizeCategory } from '@/types/category';

// App states - 10-screen workflow
export type AppState =
  | 'UNINITIALIZED'         // Screen 1: Welcome (with file types)
  | 'READY_TO_SCAN'         // Screen 2: Select Locations
  | 'SCANNING'              // Screen 3: Scanning Files (file discovery)
  | 'INDEXED_NO_AI'         // Screen 3: Scanning Files (AI analysis starting)
  | 'AI_ANALYZING'          // Screen 3: Scanning Files (AI analysis in progress)
  | 'AI_ANALYZED'           // Screen 4: Personalization (if not completed)
  | 'RESULTS_PREVIEW'       // Screen 5: Results Preview (read-only guardrail summary)
  | 'REVIEWING'             // Screen 6: Review & Exclusions
  | 'CLARIFYING'            // Screen 7: Quick Clarifications (AI questions)
  | 'EXECUTING'             // Screen 8: Applying Changes
  | 'ORGANIZATION_COMPLETE' // Screen 9: Success
  | 'DASHBOARD';            // Screen 10: Dashboard

// User intent when they started
export type UserIntent = 'find' | 'organize' | null;

// Folder selection
export interface SelectedFolder {
  id: string;
  path: string;
  name: string;
  isKnownFolder: boolean; // Desktop, Documents, Downloads
}

// Scan progress
export interface ScanProgress {
  phase: 'discovery' | 'ai_analysis';
  filesFound: number;
  filesAnalyzed: number;
  totalFiles: number;
  creditsUsed: number;
  isPaused: boolean;
}

// Free tier limits
export const FREE_TIER = {
  MAX_FILES_PER_SCAN: 500,
  MAX_TOTAL_SCANS: 10,
} as const;

// Free tier usage tracking
export interface FreeTierUsage {
  scansUsed: number;
  scansRemaining: number;
  isLimitReached: boolean;
}

// Organization styles - Three modes
// All modes use the 12-folder numbered system (01-12 for sort order)
// - simple: Life areas (Work, Money, Home, Health, etc.)
// - timeline: By Year with subfolders (2025/Q1, 2024/Q2, etc.)
// - smart_groups: Client/Project-based (AI detects companies, projects)
export type OrganizationStyle = 'simple' | 'timeline' | 'smart_groups';

// Personalization answers (Q1-Q4)
// Q1: User roles (multi-select)
export type UserRole = 'parent' | 'student' | 'teacher' | 'office' | 'freelancer' | 'business' | 'retired' | 'creative';

// Q2: How user looks up files (single-select)
export type LookupStyle = 'topic' | 'time' | 'project';

// Q3: Folder structure depth (single-select)
export type FolderDepth = 'flat' | 'moderate' | 'detailed';

// Q4: Archive policy for old files (single-select)
export type ArchivePolicy = 'keep' | 'archive';

export interface PersonalizationAnswers {
  // Q1: Multi-select - which roles describe the user
  userRoles: UserRole[];
  // Q2: Single-select - how user thinks about finding files
  lookupStyle: LookupStyle | null;
  // Q3: Single-select - folder structure depth
  folderDepth: FolderDepth | null;
  // Q4: Single-select - what to do with old files
  archivePolicy: ArchivePolicy | null;
  // Whether the user has completed onboarding
  hasCompletedPersonalization: boolean;
}

// Plan item - individual file move
export interface PlanItem {
  file_id: number;
  source_path: string;
  destination_path: string;
  confidence: number;
  reason: string;
  requires_review: boolean;
}

// Plan summary
export interface PlanSummary {
  total_files: number;
  high_confidence: number;
  low_confidence: number;
  duplicates_found: number;
  folders_to_create: string[];
}

// Organization plan
export interface OrganizationPlan {
  id: string;
  name: string;
  style: OrganizationStyle;
  items: PlanItem[];
  summary: PlanSummary;
}

// Execution result
export interface ExecutionResult {
  filesOrganized: number;
  filesFailed: number;
  filesSkipped: number;
  foldersCreated: number;
  errors: string[];
  warnings: string[];
}

// Execution progress
export interface ExecutionProgress {
  current: number;
  total: number;
  currentFile: string;
}

// Full app state
export interface AppStateData {
  state: AppState;
  intent: UserIntent;
  hasCompletedWelcome: boolean;
  selectedFolders: SelectedFolder[];
  selectedExtensions: string[]; // File extensions to scan (e.g., ['pdf', 'doc', 'docx'])
  scanProgress: ScanProgress | null;
  freeTier: FreeTierUsage;
  apiKeyConfigured: boolean;
  lastError: string | null;
  // Personalization (Q1/Q2/Q3 after scan)
  personalization: PersonalizationAnswers;
  // Organization
  selectedOrganizationStyle: OrganizationStyle | null;
  currentPlan: OrganizationPlan | null;
  isGeneratingPlan: boolean;
  testMode: boolean; // When true, don't actually move files
  // Execution
  executionProgress: ExecutionProgress | null;
  executionResult: ExecutionResult | null;
}

// Actions
type AppAction =
  | { type: 'COMPLETE_WELCOME' }
  | { type: 'SET_INTENT'; intent: UserIntent }
  | { type: 'SELECT_FOLDER'; folder: SelectedFolder }
  | { type: 'DESELECT_FOLDER'; folderId: string }
  | { type: 'SET_SELECTED_EXTENSIONS'; extensions: string[] }
  | { type: 'START_SCAN' }
  | { type: 'UPDATE_SCAN_PROGRESS'; progress: Partial<ScanProgress> }
  | { type: 'PAUSE_SCAN' }
  | { type: 'RESUME_SCAN' }
  | { type: 'CANCEL_SCAN' }
  | { type: 'COMPLETE_DISCOVERY' }
  | { type: 'START_AI_ANALYSIS' }
  | { type: 'COMPLETE_AI_ANALYSIS' }
  | { type: 'SET_API_KEY_CONFIGURED'; configured: boolean }
  | { type: 'USE_FREE_SCAN' }
  | { type: 'SET_FREE_TIER_USAGE'; scansUsed: number }
  | { type: 'SET_ERROR'; error: string | null }
  // Personalization actions (Q1-Q4)
  | { type: 'SET_USER_ROLES'; roles: UserRole[] }
  | { type: 'TOGGLE_USER_ROLE'; role: UserRole }
  | { type: 'SET_LOOKUP_STYLE'; lookupStyle: LookupStyle }
  | { type: 'SET_FOLDER_DEPTH'; folderDepth: FolderDepth }
  | { type: 'SET_ARCHIVE_POLICY'; archivePolicy: ArchivePolicy }
  | { type: 'COMPLETE_PERSONALIZATION' }
  | { type: 'SET_PERSONALIZATION_COMPLETE'; hasCompletedPersonalization: boolean }
  // 10-screen flow actions
  | { type: 'START_RESULTS_PREVIEW' }  // Screen 4 → Screen 5
  | { type: 'START_REVIEW' }           // Screen 5 → Screen 6
  | { type: 'COMPLETE_REVIEW' }        // Screen 6 → Screen 7
  | { type: 'START_CLARIFICATIONS' }   // Explicit transition to Screen 7
  | { type: 'COMPLETE_CLARIFICATIONS' } // Screen 7 → Screen 8
  // Organization actions
  | { type: 'SELECT_ORGANIZATION_STYLE'; style: OrganizationStyle }
  | { type: 'SET_TEST_MODE'; testMode: boolean }
  | { type: 'START_GENERATING_PLAN' }
  | { type: 'SET_CURRENT_PLAN'; plan: OrganizationPlan }
  | { type: 'CLEAR_PLAN' }
  | { type: 'START_EXECUTING' }
  | { type: 'UPDATE_EXECUTION_PROGRESS'; progress: ExecutionProgress }
  | { type: 'COMPLETE_EXECUTION'; result: ExecutionResult }
  | { type: 'GO_TO_DASHBOARD' }
  | { type: 'RESET_SCAN' }
  | { type: 'RESET' };

// Default extensions: PDF, TXT, Word
const DEFAULT_EXTENSIONS = ['pdf', 'txt', 'doc', 'docx'];

const initialState: AppStateData = {
  state: 'UNINITIALIZED',
  intent: null,
  hasCompletedWelcome: false,
  selectedFolders: [],
  selectedExtensions: DEFAULT_EXTENSIONS,
  scanProgress: null,
  freeTier: {
    scansUsed: 0,
    scansRemaining: FREE_TIER.MAX_TOTAL_SCANS,
    isLimitReached: false,
  },
  apiKeyConfigured: false,
  lastError: null,
  personalization: {
    userRoles: [],
    lookupStyle: null,
    folderDepth: null,
    archivePolicy: null,
    hasCompletedPersonalization: false,
  },
  selectedOrganizationStyle: null,
  currentPlan: null,
  isGeneratingPlan: false,
  testMode: true, // Default to test mode for safety
  executionProgress: null,
  executionResult: null,
};

function appReducer(state: AppStateData, action: AppAction): AppStateData {
  switch (action.type) {
    case 'COMPLETE_WELCOME':
      return {
        ...state,
        hasCompletedWelcome: true,
        state: 'READY_TO_SCAN',
        intent: 'organize', // Skip HomeScreen, go directly to folder selection
      };

    case 'SET_INTENT':
      return {
        ...state,
        intent: action.intent,
      };

    case 'SELECT_FOLDER':
      if (state.selectedFolders.some(f => f.id === action.folder.id)) {
        return state;
      }
      return {
        ...state,
        selectedFolders: [...state.selectedFolders, action.folder],
      };

    case 'DESELECT_FOLDER':
      return {
        ...state,
        selectedFolders: state.selectedFolders.filter(f => f.id !== action.folderId),
      };

    case 'SET_SELECTED_EXTENSIONS':
      return {
        ...state,
        selectedExtensions: action.extensions,
      };

    case 'START_SCAN':
      return {
        ...state,
        state: 'SCANNING',
        scanProgress: {
          phase: 'discovery',
          filesFound: 0,
          filesAnalyzed: 0,
          totalFiles: 0,
          creditsUsed: 0,
          isPaused: false,
        },
        lastError: null,
      };

    case 'UPDATE_SCAN_PROGRESS':
      if (!state.scanProgress) return state;
      return {
        ...state,
        scanProgress: {
          ...state.scanProgress,
          ...action.progress,
        },
      };

    case 'PAUSE_SCAN':
      if (!state.scanProgress) return state;
      return {
        ...state,
        scanProgress: {
          ...state.scanProgress,
          isPaused: true,
        },
      };

    case 'RESUME_SCAN':
      if (!state.scanProgress) return state;
      return {
        ...state,
        scanProgress: {
          ...state.scanProgress,
          isPaused: false,
        },
      };

    case 'CANCEL_SCAN':
      return {
        ...state,
        state: 'READY_TO_SCAN',
        scanProgress: null,
      };

    case 'COMPLETE_DISCOVERY':
      return {
        ...state,
        state: 'INDEXED_NO_AI',
        scanProgress: state.scanProgress ? {
          ...state.scanProgress,
          phase: 'ai_analysis',
        } : null,
      };

    case 'START_AI_ANALYSIS':
      return {
        ...state,
        state: 'AI_ANALYZING',
        scanProgress: state.scanProgress ? {
          ...state.scanProgress,
          phase: 'ai_analysis',
        } : null,
      };

    case 'COMPLETE_AI_ANALYSIS':
      return {
        ...state,
        state: 'AI_ANALYZED',
      };

    case 'SET_API_KEY_CONFIGURED':
      return {
        ...state,
        apiKeyConfigured: action.configured,
      };

    case 'USE_FREE_SCAN': {
      const newScansUsed = state.freeTier.scansUsed + 1;
      const newScansRemaining = FREE_TIER.MAX_TOTAL_SCANS - newScansUsed;
      return {
        ...state,
        freeTier: {
          scansUsed: newScansUsed,
          scansRemaining: newScansRemaining,
          isLimitReached: newScansRemaining <= 0,
        },
      };
    }

    case 'SET_FREE_TIER_USAGE': {
      const scansRemaining = FREE_TIER.MAX_TOTAL_SCANS - action.scansUsed;
      return {
        ...state,
        freeTier: {
          scansUsed: action.scansUsed,
          scansRemaining,
          isLimitReached: scansRemaining <= 0,
        },
      };
    }

    case 'SET_ERROR':
      return {
        ...state,
        lastError: action.error,
      };

    // Personalization actions (Q1-Q4)
    case 'SET_USER_ROLES':
      return {
        ...state,
        personalization: {
          ...state.personalization,
          userRoles: action.roles,
        },
      };

    case 'TOGGLE_USER_ROLE': {
      const currentRoles = state.personalization.userRoles;
      const hasRole = currentRoles.includes(action.role);
      return {
        ...state,
        personalization: {
          ...state.personalization,
          userRoles: hasRole
            ? currentRoles.filter(r => r !== action.role)
            : [...currentRoles, action.role],
        },
      };
    }

    case 'SET_LOOKUP_STYLE':
      return {
        ...state,
        personalization: {
          ...state.personalization,
          lookupStyle: action.lookupStyle,
        },
      };

    case 'SET_FOLDER_DEPTH':
      return {
        ...state,
        personalization: {
          ...state.personalization,
          folderDepth: action.folderDepth,
        },
      };

    case 'SET_ARCHIVE_POLICY':
      return {
        ...state,
        personalization: {
          ...state.personalization,
          archivePolicy: action.archivePolicy,
        },
      };

    case 'COMPLETE_PERSONALIZATION':
      return {
        ...state,
        state: 'RESULTS_PREVIEW', // Go to Screen 5 after personalization
        personalization: {
          ...state.personalization,
          hasCompletedPersonalization: true,
        },
      };

    case 'SET_PERSONALIZATION_COMPLETE':
      return {
        ...state,
        state: action.hasCompletedPersonalization ? 'RESULTS_PREVIEW' : 'AI_ANALYZED',
        personalization: {
          ...state.personalization,
          hasCompletedPersonalization: action.hasCompletedPersonalization,
        },
      };

    // 10-screen flow actions
    case 'START_RESULTS_PREVIEW':
      return {
        ...state,
        state: 'RESULTS_PREVIEW',
      };

    case 'START_REVIEW':
      return {
        ...state,
        state: 'CLARIFYING',
      };

    case 'COMPLETE_REVIEW':
      return {
        ...state,
        state: 'CLARIFYING',
      };

    case 'START_CLARIFICATIONS':
      return {
        ...state,
        state: 'CLARIFYING',
      };

    case 'COMPLETE_CLARIFICATIONS':
      return {
        ...state,
        state: 'EXECUTING',
        executionProgress: { current: 0, total: state.currentPlan?.items.length || 0, currentFile: '' },
        executionResult: null,
      };

    case 'SELECT_ORGANIZATION_STYLE':
      return {
        ...state,
        selectedOrganizationStyle: action.style,
      };

    case 'SET_TEST_MODE':
      return {
        ...state,
        testMode: action.testMode,
      };

    case 'START_GENERATING_PLAN':
      return {
        ...state,
        isGeneratingPlan: true,
        currentPlan: null,
      };

    case 'SET_CURRENT_PLAN':
      return {
        ...state,
        state: 'CLARIFYING', // Skip mock DetailedReviewScreen, go to Quick Fixes
        currentPlan: action.plan,
        isGeneratingPlan: false,
      };

    case 'CLEAR_PLAN':
      return {
        ...state,
        state: 'AI_ANALYZED',
        currentPlan: null,
        selectedOrganizationStyle: null,
        isGeneratingPlan: false,
      };

    case 'START_EXECUTING':
      return {
        ...state,
        state: 'EXECUTING',
        executionProgress: { current: 0, total: state.currentPlan?.items.length || 0, currentFile: '' },
        executionResult: null,
      };

    case 'UPDATE_EXECUTION_PROGRESS':
      return {
        ...state,
        executionProgress: action.progress,
      };

    case 'COMPLETE_EXECUTION':
      return {
        ...state,
        state: 'ORGANIZATION_COMPLETE',
        executionProgress: null,
        executionResult: action.result,
      };

    case 'GO_TO_DASHBOARD':
      return {
        ...state,
        state: 'DASHBOARD',
        currentPlan: null,
        executionResult: null,
      };

    case 'RESET_SCAN':
      return {
        ...state,
        state: 'READY_TO_SCAN',
        scanProgress: null,
        currentPlan: null,
        selectedOrganizationStyle: null,
        isGeneratingPlan: false,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface AppStateContextType {
  state: AppStateData;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  completeWelcome: () => void;
  setIntent: (intent: UserIntent) => void;
  selectFolder: (folder: SelectedFolder) => void;
  deselectFolder: (folderId: string) => void;
  startScan: () => void;
  pauseScan: () => void;
  resumeScan: () => void;
  cancelScan: () => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const completeWelcome = useCallback(() => dispatch({ type: 'COMPLETE_WELCOME' }), []);
  const setIntent = useCallback((intent: UserIntent) => dispatch({ type: 'SET_INTENT', intent }), []);
  const selectFolder = useCallback((folder: SelectedFolder) => dispatch({ type: 'SELECT_FOLDER', folder }), []);
  const deselectFolder = useCallback((folderId: string) => dispatch({ type: 'DESELECT_FOLDER', folderId }), []);
  const startScan = useCallback(() => dispatch({ type: 'START_SCAN' }), []);
  const pauseScan = useCallback(() => dispatch({ type: 'PAUSE_SCAN' }), []);
  const resumeScan = useCallback(() => dispatch({ type: 'RESUME_SCAN' }), []);
  const cancelScan = useCallback(() => dispatch({ type: 'CANCEL_SCAN' }), []);

  return (
    <AppStateContext.Provider value={{
      state,
      dispatch,
      completeWelcome,
      setIntent,
      selectFolder,
      deselectFolder,
      startScan,
      pauseScan,
      resumeScan,
      cancelScan,
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
