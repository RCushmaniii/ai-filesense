import { useState, useEffect } from 'react';
import { I18nProvider } from './i18n';
import { AppStateProvider, useAppState } from './store/appState';
import {
  WelcomeScreen,
  FolderSelectionScreen,
  ScanningScreen,
  PersonalizationScreen,
  ResultsScreen,
  DetailedReviewScreen,
  QuickFixesScreen,
  ApplyingChangesScreen,
  SuccessScreen,
  DashboardScreen,
  SettingsScreen,
} from './screens';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { CrashRecoveryDialog } from './components/CrashRecoveryDialog';
import { useTranslation } from './i18n';
import { Settings } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SessionSummary {
  session_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  selected_mode: string | null;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
}

interface IncompleteSession {
  session: SessionSummary;
  operations: unknown[];
  errors: unknown[];
}

function AppContent() {
  const { state, dispatch } = useAppState();
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [incompleteSessions, setIncompleteSessions] = useState<IncompleteSession[]>([]);

  // Sync free tier usage from backend on startup (prevents bypass via devtools)
  useEffect(() => {
    const syncFreeTier = async () => {
      try {
        const scansUsed = await invoke<number>('get_scan_count');
        dispatch({ type: 'SET_FREE_TIER_USAGE', scansUsed });
      } catch (error) {
        console.error('Error syncing free tier usage:', error);
      }
    };

    syncFreeTier();
  }, [dispatch]);

  // Check for incomplete sessions on startup (crash recovery)
  useEffect(() => {
    const checkIncomplete = async () => {
      try {
        const sessions = await invoke<IncompleteSession[]>('get_incomplete_session_details');
        if (sessions && sessions.length > 0) {
          setIncompleteSessions(sessions);
        }
      } catch (error) {
        console.error('Error checking incomplete sessions:', error);
      }
    };

    checkIncomplete();
  }, []);

  /**
   * 10-Screen Workflow Routing:
   *
   * 1. Welcome (with file types) - !hasCompletedWelcome
   * 2. Select Locations         - READY_TO_SCAN
   * 3. Scanning Files           - SCANNING, INDEXED_NO_AI, AI_ANALYZING
   * 4. Personalization          - AI_ANALYZED (if not completed)
   * 5. Results Preview          - RESULTS_PREVIEW
   * 6. Review & Exclusions      - REVIEWING
   * 7. Quick Clarifications     - CLARIFYING
   * 8. Applying Changes         - EXECUTING
   * 9. Success                  - ORGANIZATION_COMPLETE
   * 10. Dashboard               - DASHBOARD
   */
  const renderScreen = () => {
    // Screen 1: Welcome (with file type selection)
    if (!state.hasCompletedWelcome) {
      return <WelcomeScreen />;
    }

    switch (state.state) {
      // Screen 2: Select Locations
      case 'UNINITIALIZED':
      case 'READY_TO_SCAN':
        return <FolderSelectionScreen />;

      // Screen 3: Scanning Files
      case 'SCANNING':
      case 'INDEXED_NO_AI':
      case 'AI_ANALYZING':
        return <ScanningScreen />;

      // Screen 4: Personalization (optional)
      case 'AI_ANALYZED':
        // Show personalization if not completed yet
        if (!state.personalization.hasCompletedPersonalization) {
          return <PersonalizationScreen />;
        }
        // If somehow we're in AI_ANALYZED but personalization is done,
        // fall through to results preview
        return <ResultsScreen />;

      // Screen 5: Results Preview (read-only guardrail summary)
      case 'RESULTS_PREVIEW':
        return <ResultsScreen />;

      // Screen 6: Review & Exclusions
      case 'REVIEWING':
        return <DetailedReviewScreen />;

      // Screen 7: Quick Clarifications (AI questions)
      case 'CLARIFYING':
        return <QuickFixesScreen />;

      // Screen 8: Applying Changes
      case 'EXECUTING':
        return <ApplyingChangesScreen />;

      // Screen 9: Success
      case 'ORGANIZATION_COMPLETE':
        return <SuccessScreen />;

      // Screen 10: Dashboard
      case 'DASHBOARD':
        return <DashboardScreen />;

      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col overflow-hidden">
      {/* Header - only show after welcome */}
      {state.hasCompletedWelcome && (
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container flex h-14 items-center justify-between px-4">
            <button
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              onClick={() => dispatch({ type: 'RESET_SCAN' })}
              title={t('app.startOver')}
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AI</span>
              </div>
              <span className="font-semibold">{t('app.name')}</span>
            </button>
            <div className="flex items-center gap-2">
              <LanguageSwitcher minimal />
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('settings.title')}
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {renderScreen()}
      </main>

      {/* Footer - only show after welcome */}
      {state.hasCompletedWelcome && (
        <footer className="border-t py-3">
          <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© 2025 AI FileSense. {t('footer.allRightsReserved')}</span>
            <div className="flex items-center gap-4">
              <a
                href="https://ai-filesense-website.vercel.app/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t('footer.privacy')}
              </a>
              <a
                href="https://ai-filesense-website.vercel.app/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t('footer.terms')}
              </a>
              <a
                href="https://ai-filesense-website.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t('footer.website')}
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsScreen onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Crash Recovery Dialog - show first incomplete session (most recent) */}
      {incompleteSessions.length > 0 && (
        <CrashRecoveryDialog
          session={incompleteSessions[0]}
          allSessions={incompleteSessions}
          onResolved={() => {
            // Remove the first session from the list; if more remain, they'll show next
            setIncompleteSessions(prev => prev.slice(1));
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </I18nProvider>
  );
}

export default App;
