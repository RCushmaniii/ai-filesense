/**
 * Scanning Screen
 *
 * Shows progress while scanning and analyzing files.
 * Includes rotating status messages to reassure users.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import { invoke } from '@tauri-apps/api/core';
import {
  Loader2,
  Pause,
  Play,
  X,
  Sparkles,
  FileSearch,
  Brain,
  AlertCircle,
  FolderOpen,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

// Type for classification progress from backend
interface ClassificationProgress {
  total_files: number;
  classified: number;
  credits_used: number;
  estimated_credits: number;
}

// Type for scanned files result
interface ScannedFile {
  path: string;
  filename: string;
}

// Bank of rotating status messages for AI analysis phase
// Organized by tone: early (reassurance/trust), mid (technical/insight), late (outcome)
const AI_STATUS_MESSAGES = [
  // Early - Trust & Reassurance
  'scanning.status.local_only',
  'scanning.status.no_changes_yet',
  'scanning.status.nothing_moved',
  'scanning.status.files_remain',
  'scanning.status.you_control',
  // Mid - Technical & Insight
  'scanning.status.analyzing_names',
  'scanning.status.identifying_types',
  'scanning.status.extracting_metadata',
  'scanning.status.detecting_topics',
  'scanning.status.mapping_patterns',
  'scanning.status.learning_relationships',
  'scanning.status.recurring_patterns',
  'scanning.status.belong_together',
  'scanning.status.scoring_similarity',
  'scanning.status.inferring_projects',
  // Late - Outcome-Oriented
  'scanning.status.building_model',
  'scanning.status.preparing_suggestions',
  'scanning.status.improving_accuracy',
  'scanning.status.cleaner_folders',
  'scanning.status.fits_how_you_work',
  'scanning.status.faster_searches',
  'scanning.status.smarter_grouping',
  'scanning.status.opportunities_clear',
];

export function ScanningScreen() {
  const { t, language } = useTranslation();
  const { state, pauseScan, resumeScan, cancelScan, dispatch } = useAppState();
  const scanStarted = useRef(false);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Simulated progress for discovery phase (since backend returns all at once)
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);

  // Track when no files are found (for friendly empty state)
  const [noFilesFound, setNoFilesFound] = useState(false);

  // Rotating status message index
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);
  const lastStatusUpdateRef = useRef(0);

  const isSpanish = language === 'es-MX';

  // Keep ref in sync with state
  useEffect(() => {
    isPausedRef.current = state.scanProgress?.isPaused || false;
  }, [state.scanProgress?.isPaused]);

  const progress = state.scanProgress;
  const isDiscoveryPhase = progress?.phase === 'discovery';
  const isAIPhase = progress?.phase === 'ai_analysis';

  // Rotate status message every ~20 files analyzed
  useEffect(() => {
    if (!isAIPhase || !progress?.filesAnalyzed) return;

    const currentAnalyzed = progress.filesAnalyzed;
    // Update message every 20 files
    if (currentAnalyzed - lastStatusUpdateRef.current >= 20) {
      lastStatusUpdateRef.current = currentAnalyzed;
      setStatusMessageIndex(prev => (prev + 1) % AI_STATUS_MESSAGES.length);
    }
  }, [isAIPhase, progress?.filesAnalyzed]);

  // Also rotate message on a timer as backup (every 5 seconds)
  useEffect(() => {
    if (!isAIPhase) return;

    const interval = setInterval(() => {
      setStatusMessageIndex(prev => (prev + 1) % AI_STATUS_MESSAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAIPhase]);

  // Animate progress during discovery phase
  useEffect(() => {
    if (!isDiscoveryPhase || discoveryComplete || isPausedRef.current) return;

    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        // Slow down as we approach 45% (leave room for completion jump)
        if (prev >= 45) return prev;
        const increment = Math.max(0.5, (45 - prev) / 20);
        return Math.min(45, prev + increment);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isDiscoveryPhase, discoveryComplete]);

  // When discovery completes, jump to 50%
  useEffect(() => {
    if (progress?.filesFound && progress.filesFound > 0 && isDiscoveryPhase) {
      setDiscoveryComplete(true);
      setSimulatedProgress(50);
    }
  }, [progress?.filesFound, isDiscoveryPhase]);

  // Run AI classification in batches
  const runAIClassification = useCallback(async (totalFiles: number) => {
    dispatch({ type: 'START_AI_ANALYSIS' });

    const batchSize = 20;
    const batchTimeout = 30000; // 30 seconds per batch

    // Process batches until all files are classified
    let classified = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    while (classified < totalFiles && !isCancelledRef.current) {
      // Wait while paused
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (isCancelledRef.current) break;

      try {
        // Add timeout for each batch
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI classification timed out. Check your API key configuration.')), batchTimeout);
        });

        // Call backend to classify a batch (API key loaded from env on backend)
        const result = await Promise.race([
          invoke<ClassificationProgress>('classify_files', { batchSize }),
          timeoutPromise,
        ]);

        classified = result.classified;
        consecutiveErrors = 0; // Reset on success

        dispatch({
          type: 'UPDATE_SCAN_PROGRESS',
          progress: {
            filesAnalyzed: classified,
          }
        });

        // If no more files to classify, we're done
        if (result.classified >= result.total_files) {
          break;
        }

        // Small delay between batches to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error('[AI] Classification error:', error);
        consecutiveErrors++;

        if (consecutiveErrors >= maxConsecutiveErrors) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          dispatch({ type: 'SET_ERROR', error: `AI classification failed after ${maxConsecutiveErrors} attempts: ${errorMsg}` });
          break;
        }

        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Complete AI analysis
    if (!isCancelledRef.current && consecutiveErrors < maxConsecutiveErrors) {
      dispatch({ type: 'COMPLETE_AI_ANALYSIS' });
    }
  }, [dispatch]);

  // Start the scan when component mounts
  useEffect(() => {
    if (scanStarted.current) return;
    scanStarted.current = true;
    isCancelledRef.current = false;

    const runScan = async () => {
      try {
        // Get folder paths to scan
        const paths = state.selectedFolders.map(f => f.path);

        // Add timeout to prevent hanging forever
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Scan timed out after 60 seconds. Make sure you are running with "npm run tauri dev".')), 60000);
        });

        // Call Tauri backend to scan with extension filter
        const files = await Promise.race([
          invoke<ScannedFile[]>('scan_directories', {
            directories: paths,
            extensions: state.selectedExtensions.length > 0 ? state.selectedExtensions : null,
          }),
          timeoutPromise,
        ]);

        const fileCount = files.length;

        if (fileCount === 0) {
          // Show friendly empty state instead of error
          setNoFilesFound(true);
          return;
        }

        // Update progress - discovery complete
        dispatch({
          type: 'UPDATE_SCAN_PROGRESS',
          progress: {
            filesFound: fileCount,
            totalFiles: fileCount,
          }
        });

        // Move to indexed state (discovery complete, ready for AI)
        dispatch({ type: 'COMPLETE_DISCOVERY' });

        // Run real AI classification
        await runAIClassification(fileCount);

      } catch (error) {
        console.error('[Scanning] Error:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'SET_ERROR', error: errorMsg });
      }
    };

    runScan();
  }, []);

  // Handle cancel
  const handleCancel = () => {
    isCancelledRef.current = true;
    cancelScan();
  };

  // Handle going back to folder selection
  const handleGoBack = () => {
    dispatch({ type: 'RESET_SCAN' });
  };

  // Handle opening the Organized Files folder
  const handleOpenOrganizedFiles = async () => {
    try {
      await invoke('open_folder', { path: 'Organized Files' });
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  const progressValue = progress ?
    (isDiscoveryPhase
      ? simulatedProgress // Use animated progress during discovery
      : 50 + (progress.filesAnalyzed / Math.max(progress.totalFiles, 1)) * 50 // 50-100% during AI
    ) : 0;

  // Get current status message
  const currentStatusMessage = AI_STATUS_MESSAGES[statusMessageIndex];

  // Show friendly "no files found" screen
  if (noFilesFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full space-y-8">
          {/* Stepper */}
          <Stepper steps={ORGANIZATION_STEPS} currentStep={1} />

          {/* Success-like icon (files are already organized!) */}
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Friendly message */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-semibold">
              {isSpanish ? '¡Todo está organizado!' : 'Everything is organized!'}
            </h1>
            <p className="text-muted-foreground">
              {isSpanish
                ? 'No encontramos archivos nuevos para organizar en las carpetas seleccionadas.'
                : 'We didn\'t find any new files to organize in the selected folders.'}
            </p>
          </div>

          {/* Helpful suggestions card */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">
                {isSpanish ? '¿Qué puedes hacer?' : 'What can you do?'}
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {isSpanish
                    ? 'Revisa tus archivos organizados en la carpeta "Organized Files"'
                    : 'Check your organized files in the "Organized Files" folder'}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {isSpanish
                    ? 'Agrega nuevos archivos a Escritorio, Documentos o Descargas'
                    : 'Add new files to Desktop, Documents, or Downloads'}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {isSpanish
                    ? 'Selecciona diferentes carpetas para escanear'
                    : 'Select different folders to scan'}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleOpenOrganizedFiles}
            >
              <FolderOpen className="h-5 w-5" />
              {isSpanish ? 'Ver archivos organizados' : 'View organized files'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-5 w-5" />
              {isSpanish ? 'Seleccionar otras carpetas' : 'Select different folders'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Stepper */}
        <Stepper steps={ORGANIZATION_STEPS} currentStep={1} />

        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              {isDiscoveryPhase ? (
                <FileSearch className="h-12 w-12 text-primary animate-pulse" />
              ) : (
                <Brain className="h-12 w-12 text-primary animate-pulse" />
              )}
            </div>
            {!progress?.isPaused && (
              <div className="absolute -top-1 -right-1">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">
            {isDiscoveryPhase
              ? t('scanning.finding')
              : t('scanning.understanding')
            }
          </h1>
          <p className="text-muted-foreground">
            {isDiscoveryPhase
              ? t('scanning.filesFound', { count: progress?.filesFound || 0 })
              : t('scanning.analyzing', {
                  current: progress?.filesAnalyzed || 0,
                  total: progress?.totalFiles || 0
                })
            }
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-3">
          <Progress value={progressValue} className="h-3" />
        </div>

        {/* AI status card with rotating messages */}
        {isAIPhase && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="p-4 flex gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-base text-blue-800 dark:text-blue-200 transition-opacity duration-300">
                {t(currentStatusMessage)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Control buttons */}
        <div className="flex gap-3 justify-center">
          {progress?.isPaused ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={resumeScan}
            >
              <Play className="h-4 w-4" />
              {t('scanning.resume')}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-2"
              onClick={pauseScan}
            >
              <Pause className="h-4 w-4" />
              {t('scanning.pause')}
            </Button>
          )}
          <Button
            variant="ghost"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
            {t('scanning.cancel')}
          </Button>
        </div>

        {/* Paused indicator */}
        {progress?.isPaused && (
          <p className="text-center text-sm text-muted-foreground">
            {t('scanning.paused')}
          </p>
        )}

        {/* Error display */}
        {state.lastError && (
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <CardContent className="p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {t('common.error')}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {state.lastError}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
