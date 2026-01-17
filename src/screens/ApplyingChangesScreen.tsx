/**
 * Applying Changes Screen (Screen 8 of 10)
 *
 * Core Principle: Non-interactive execution
 * - Executes a short, bounded operation
 * - Communicates clearly what's happening
 * - Completes automatically
 * - Rolls back only if something goes wrong
 *
 * The user's role is to observe, not intervene.
 *
 * NO Stop button, NO Back button, NO changes allowed.
 * Automatic continuation to completion. Rollback only on error.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import { invoke } from '@tauri-apps/api/core';
import {
  FolderSync,
  CheckCircle,
  RefreshCw,
  Lock,
  AlertTriangle,
} from 'lucide-react';

// Status messages for different phases - calm, declarative tone
const STATUS_MESSAGES = {
  en: [
    'Creating your folder structure',
    'Moving files into organized folders',
    'Processing documents',
    'Organizing Work and School files',
    'Sorting Money and Legal documents',
    'Arranging Projects and Archive',
    'Leaving Review files untouched',
    'Finalizing organization',
  ],
  es: [
    'Creando la estructura de carpetas',
    'Moviendo archivos a carpetas organizadas',
    'Procesando documentos',
    'Organizando archivos de Trabajo y Escuela',
    'Ordenando documentos de Dinero y Legal',
    'Organizando Proyectos y Archivo',
    'Dejando archivos de Revisar sin tocar',
    'Finalizando la organización',
  ],
};

interface ExecutionProgress {
  current: number;
  total: number;
  foldersCreated: number;
  filesOrganized: number;
  errors: string[];
}

interface ExecutionError {
  title: string;
  message: string;
  isRecoverable: boolean;
}

export function ApplyingChangesScreen() {
  const { t, language } = useTranslation();
  const { state, dispatch } = useAppState();
  const [progress, setProgress] = useState<ExecutionProgress>({
    current: 0,
    total: 0,
    foldersCreated: 0,
    filesOrganized: 0,
    errors: [],
  });
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const [error, setError] = useState<ExecutionError | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const isExecutingRef = useRef(false);

  const plan = state.currentPlan;
  const isSpanish = language === 'es-MX';
  const messages = isSpanish ? STATUS_MESSAGES.es : STATUS_MESSAGES.en;

  // Cycle through status messages
  useEffect(() => {
    if (error) return;

    const interval = setInterval(() => {
      setStatusMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [messages.length, error]);

  // Execute the plan
  useEffect(() => {
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;

    const executePlan = async () => {
      // If no plan or no items, use a default from scan progress
      const totalItems = plan?.items?.length || state.scanProgress?.totalFiles || 50;
      setProgress((prev) => ({ ...prev, total: totalItems }));

      try {
        console.log('[ApplyingChanges] Starting execution, total items:', totalItems);

        // Simulate progress updates while executing
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev.current >= prev.total) {
              clearInterval(progressInterval);
              return prev;
            }
            const increment = Math.max(1, Math.floor(prev.total / 20)); // ~5% increments
            const newCurrent = Math.min(prev.current + increment, prev.total);
            return {
              ...prev,
              current: newCurrent,
              filesOrganized: newCurrent,
            };
          });
        }, 300);

        // Execute the plan
        const result = await invoke<{
          files_moved: number;
          folders_created: number;
          errors: string[];
        }>('execute_plan', {
          planId: plan?.id || 'default',
          testMode: state.testMode,
        });

        clearInterval(progressInterval);

        console.log('[ApplyingChanges] Execution complete:', result);

        // Update final progress
        setProgress({
          current: totalItems,
          total: totalItems,
          filesOrganized: result.files_moved,
          foldersCreated: result.folders_created,
          errors: result.errors,
        });

        // Brief pause before transitioning (500ms for visual confirmation)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Automatic transition to success screen
        dispatch({
          type: 'COMPLETE_EXECUTION',
          result: {
            filesOrganized: result.files_moved,
            filesFailed: result.errors.length,
            filesSkipped: 0,
            foldersCreated: result.folders_created,
            errors: result.errors,
            warnings: [],
          },
        });
      } catch (err) {
        console.error('[ApplyingChanges] Execution error:', err);
        const errorMessage = String(err);

        // Determine if error is recoverable
        const isNonRecoverable =
          errorMessage.includes('disk full') ||
          errorMessage.includes('filesystem') ||
          errorMessage.includes('permission denied');

        if (isNonRecoverable) {
          // Non-recoverable: trigger rollback
          setError({
            title: isSpanish
              ? 'Tuvimos que detenernos para mantener tus archivos seguros'
              : 'We had to stop to keep your files safe',
            message: isSpanish
              ? 'No se finalizaron cambios. Puedes intentar de nuevo después de resolver el problema.'
              : 'No changes were finalized. You can try again after resolving the issue.',
            isRecoverable: false,
          });

          // Attempt rollback
          setIsRollingBack(true);
          try {
            await invoke('undo_last_operation');
          } catch (rollbackErr) {
            console.error('[ApplyingChanges] Rollback failed:', rollbackErr);
          }
          setIsRollingBack(false);
        } else {
          // Recoverable: log and continue - shouldn't normally reach here
          // as the backend handles recoverable errors internally
          dispatch({
            type: 'COMPLETE_EXECUTION',
            result: {
              filesOrganized: progress.filesOrganized,
              filesFailed: 1,
              filesSkipped: 0,
              foldersCreated: progress.foldersCreated,
              errors: [errorMessage],
              warnings: [],
            },
          });
        }
      }
    };

    executePlan();
  }, [plan, state.testMode, dispatch, isSpanish, progress.filesOrganized, progress.foldersCreated]);

  const handleReturnToDashboard = () => {
    dispatch({ type: 'GO_TO_DASHBOARD' });
  };

  const progressPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  // Error state - non-recoverable
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Error icon */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {/* Error message */}
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">{error.title}</h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {error.message}
            </p>
            {isRollingBack && (
              <p className="text-sm text-muted-foreground">
                {isSpanish ? 'Restaurando archivos...' : 'Restoring files...'}
              </p>
            )}
          </div>

          {/* Return to dashboard */}
          {!isRollingBack && (
            <Button size="lg" onClick={handleReturnToDashboard}>
              {isSpanish ? 'Volver al panel' : 'Return to Dashboard'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-lg w-full mx-auto space-y-8">
        {/* Stepper - Step 7 of 8: Apply */}
        <Stepper steps={ORGANIZATION_STEPS} currentStep={6} />

        {/* A. Title Area - Centered */}
        <div className="text-center space-y-3 pt-8">
          {/* Animated icon */}
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <FolderSync className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>

          {/* Title - 20-22px */}
          <h1 className="text-[22px] font-semibold">{t('applyingChanges.title')}</h1>

          {/* Subtitle - 16-18px, static */}
          <p className="text-[17px] text-muted-foreground">
            {t('applyingChanges.subtitle')}
          </p>
        </div>

        {/* B. Progress Indicator */}
        <div className="space-y-4">
          <Progress value={progressPercent} className="h-3" />
          <p className="text-center text-base">
            <span className="font-medium">{progress.current.toLocaleString()}</span>
            <span className="text-muted-foreground">
              {' '}
              {isSpanish ? 'de' : 'of'}{' '}
            </span>
            <span className="font-medium">{progress.total.toLocaleString()}</span>
            <span className="text-muted-foreground">
              {' '}
              {isSpanish ? 'archivos organizados' : 'files organized'}
            </span>
          </p>
        </div>

        {/* C. Status Messages - Key Trust Element */}
        <div className="text-center min-h-[60px] flex items-center justify-center">
          <p className="text-[17px] text-foreground/90 leading-relaxed transition-opacity duration-500">
            {messages[statusMessageIndex]}
          </p>
        </div>

        {/* D. Safety Reassurance Strip - Persistent */}
        <div className="flex items-center justify-center gap-6 py-4 border-t border-b">
          <div className="flex items-center gap-2 text-[15px]">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium">
              {isSpanish ? 'Sin eliminaciones' : 'No files deleted'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[15px]">
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">
              {isSpanish ? 'Deshacer disponible' : 'Undo available'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[15px]">
            <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="font-medium">
              {isSpanish ? 'Archivos locales' : 'Files stay local'}
            </span>
          </div>
        </div>

        {/* Test mode indicator (if applicable) */}
        {state.testMode && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400 font-medium">
            {t('applyingChanges.testModeActive')}
          </p>
        )}
      </div>
    </div>
  );
}
