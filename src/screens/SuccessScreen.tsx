/**
 * Success Screen (Screen 9 of 10)
 *
 * The emotional payoff - where trust is cemented.
 *
 * Answers in order:
 * 1. Did it work?
 * 2. What exactly changed?
 * 3. Am I safe if I don't like it?
 * 4. What should I do next (if anything)?
 *
 * Feels: Calm, Clear, Finished (not like a checkpoint)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import { invoke } from '@tauri-apps/api/core';
import {
  CheckCircle2,
  FolderOpen,
  Undo2,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Eye,
  Loader2,
  FileText,
} from 'lucide-react';

// The 11 guardrail folders in order
// displayNumber for UI, folderNumber for actual disk path
const GUARDRAIL_FOLDERS = [
  { id: 'Review', displayNumber: '00', folderNumber: '11', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'Work', displayNumber: '01', folderNumber: '01', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'Money', displayNumber: '02', folderNumber: '02', color: 'text-green-600 dark:text-green-400' },
  { id: 'Home', displayNumber: '03', folderNumber: '03', color: 'text-orange-600 dark:text-orange-400' },
  { id: 'Health', displayNumber: '04', folderNumber: '04', color: 'text-red-600 dark:text-red-400' },
  { id: 'Legal', displayNumber: '05', folderNumber: '05', color: 'text-purple-600 dark:text-purple-400' },
  { id: 'School', displayNumber: '06', folderNumber: '06', color: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'Family', displayNumber: '07', folderNumber: '07', color: 'text-pink-600 dark:text-pink-400' },
  { id: 'Clients', displayNumber: '08', folderNumber: '08', color: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'Projects', displayNumber: '09', folderNumber: '09', color: 'text-teal-600 dark:text-teal-400' },
  { id: 'Archive', displayNumber: '10', folderNumber: '10', color: 'text-slate-600 dark:text-slate-400' },
];

interface GuardrailCount {
  category: string;
  count: number;
}

export function SuccessScreen() {
  const { t, language } = useTranslation();
  const { state, dispatch } = useAppState();
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [guardrailCounts, setGuardrailCounts] = useState<GuardrailCount[]>([]);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  const isSpanish = language === 'es-MX';

  // Get stats from execution result in state
  const result = state.executionResult;
  const filesOrganized = result?.filesOrganized || 0;
  const foldersCreated = result?.foldersCreated || 0;
  const reviewCount = guardrailCounts.find((g) => g.category === 'Review')?.count || 0;
  const errorsCount = result?.errors?.length || 0;
  const duplicatesCount = 0; // Will come from backend if implemented

  // Load guardrail counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const counts = await invoke<GuardrailCount[]>('get_category_breakdown');
        setGuardrailCounts(counts);
      } catch (err) {
        console.error('[Success] Error loading guardrail counts:', err);
        // Fallback: empty counts
        setGuardrailCounts([]);
      } finally {
        setIsLoadingCounts(false);
      }
    };

    loadCounts();
  }, []);

  const handleOpenFolder = async (category?: string) => {
    try {
      if (category) {
        // Find the folder with the matching category
        const folder = GUARDRAIL_FOLDERS.find((f) => f.id === category);
        if (folder) {
          // Use folderNumber for actual disk path
          await invoke('open_folder', { path: `Organized Files/${folder.folderNumber} ${folder.id}` });
        } else {
          await invoke('open_folder', { path: 'Organized Files' });
        }
      } else {
        // Open the main Organized Files folder
        await invoke('open_folder', { path: 'Organized Files' });
      }
    } catch (error) {
      console.error('Error opening folder:', error);
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await invoke('undo_last_operation');
      dispatch({ type: 'RESET_SCAN' });
    } catch (error) {
      console.error('Error undoing:', error);
      setIsUndoing(false);
    }
  };

  const handleDashboard = () => {
    dispatch({ type: 'GO_TO_DASHBOARD' });
  };

  const handleReviewNow = () => {
    // Navigate to dashboard with review filter
    dispatch({ type: 'GO_TO_DASHBOARD' });
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolder(expandedFolder === folderId ? null : folderId);
  };

  const getLocalizedCategory = (category: string) => {
    return t(`categories.${category}`);
  };

  // Get folder count
  const getFolderCount = (folderId: string) => {
    const found = guardrailCounts.find(
      (g) => g.category.toLowerCase() === folderId.toLowerCase()
    );
    return found?.count || 0;
  };

  // Filter folders with files
  const foldersWithFiles = GUARDRAIL_FOLDERS.filter((f) => getFolderCount(f.id) > 0);

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        {/* Stepper - Step 5 of 5: Done */}
        <Stepper steps={ORGANIZATION_STEPS} currentStep={4} />

        {/* 1. Summary Section - Top */}
        <div className="text-center space-y-4">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Title - 22-24px, confident */}
          <h1 className="text-[24px] font-semibold">{t('success.title')}</h1>

          {/* Subtitle - 16-18px */}
          <p className="text-[17px] text-muted-foreground">
            {t('success.subtitle')}
          </p>
        </div>

        {/* Summary Card - Prominent */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-8">
              {/* Primary metric - larger */}
              <div className="text-center">
                <p className="text-[28px] font-bold text-primary">
                  {filesOrganized.toLocaleString()}
                </p>
                <p className="text-[15px] text-muted-foreground">
                  {t('success.filesOrganized')}
                </p>
              </div>

              {/* Secondary metrics */}
              <div className="text-center">
                <p className="text-[22px] font-semibold text-muted-foreground">
                  {foldersCreated}
                </p>
                <p className="text-[14px] text-muted-foreground">
                  {t('success.foldersCreated')}
                </p>
              </div>

              {reviewCount > 0 && (
                <div className="text-center">
                  <p className="text-[22px] font-semibold text-amber-600 dark:text-amber-400">
                    {reviewCount}
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    {isSpanish ? 'para revisar' : 'in Review'}
                  </p>
                </div>
              )}

              {duplicatesCount > 0 && (
                <div className="text-center">
                  <p className="text-[22px] font-semibold text-muted-foreground">
                    {duplicatesCount}
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    {isSpanish ? 'duplicados' : 'duplicates'}
                  </p>
                </div>
              )}
            </div>

            {/* Reassurance Line - Always visible */}
            <p className="text-center text-[15px] text-muted-foreground mt-4 pt-4 border-t">
              {isSpanish
                ? 'No se eliminaron archivos. Deshacer disponible.'
                : 'No files were deleted. Undo is available.'}
            </p>
          </CardContent>
        </Card>

        {/* 2. Guardrail Breakdown - Core Transparency */}
        <div className="space-y-3">
          <h2 className="text-[16px] font-medium">
            {isSpanish ? 'Dónde fueron tus archivos' : 'Where your files went'}
          </h2>

          {isLoadingCounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : foldersWithFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isSpanish ? 'No se movieron archivos' : 'No files were moved'}
            </p>
          ) : (
            <div className="space-y-1">
              {foldersWithFiles.map((folder) => {
                const count = getFolderCount(folder.id);
                const isExpanded = expandedFolder === folder.id;
                const isReview = folder.id === 'Review';

                return (
                  <div key={folder.id} className="border rounded-lg overflow-hidden">
                    <button
                      className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                        isReview ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                      }`}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground">
                          {folder.displayNumber}
                        </span>
                        <span className={`font-medium ${folder.color}`}>
                          {getLocalizedCategory(folder.id)}
                        </span>
                        {isReview && count > 0 && (
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] text-muted-foreground">
                          {count} {isSpanish ? 'archivos' : 'files'}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/30 p-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>
                            {isSpanish
                              ? `${count} archivos en esta carpeta`
                              : `${count} files in this folder`}
                          </span>
                        </div>
                        <button
                          className="mt-2 text-primary text-sm hover:underline flex items-center gap-1"
                          onClick={() => handleOpenFolder(folder.id)}
                        >
                          <FolderOpen className="h-3 w-3" />
                          {isSpanish ? 'Ver carpeta' : 'View folder'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Review & Exceptions - Non-alarming */}
        {reviewCount > 0 && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-[15px] font-medium text-amber-800 dark:text-amber-200">
                    {isSpanish
                      ? 'Algunos archivos necesitan tu revisión'
                      : 'A few files need your input'}
                  </p>
                  <p className="text-[14px] text-amber-700 dark:text-amber-300">
                    {isSpanish
                      ? `${reviewCount} archivos no se movieron porque no estábamos completamente seguros.`
                      : `${reviewCount} files weren't moved because we weren't fully confident.`}
                  </p>
                  <div className="flex gap-3 pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={handleReviewNow}
                    >
                      {isSpanish ? 'Revisar ahora' : 'Review now'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDashboard}>
                      {isSpanish ? 'Hacer después' : 'Do this later'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skipped files notice (if any) */}
        {errorsCount > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {isSpanish
              ? `${errorsCount} archivos no pudieron moverse y se dejaron en su lugar.`
              : `${errorsCount} files couldn't be moved and were left in place.`}
          </p>
        )}

        {/* If Review is empty - subtle success */}
        {reviewCount === 0 && !isLoadingCounts && (
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-[15px]">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {isSpanish
                ? 'No hay nada que revisar ahora'
                : 'Nothing needs review right now'}
            </span>
          </div>
        )}

        {/* 4. Next Actions - Bottom */}
        <div className="space-y-4 pt-4">
          {/* Primary action */}
          <Button size="lg" className="w-full gap-2" onClick={handleDashboard}>
            <LayoutDashboard className="h-5 w-5" />
            {isSpanish ? 'Ir al panel' : 'Go to dashboard'}
          </Button>

          {/* Secondary action */}
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2"
            onClick={() => handleOpenFolder()}
          >
            <Eye className="h-5 w-5" />
            {isSpanish ? 'Revisar organización' : 'Review organization'}
          </Button>
        </div>

        {/* Undo Section - Always available, de-emphasized but clear */}
        <div className="border-t pt-6 space-y-3">
          <div className="text-center">
            <p className="text-[15px] text-muted-foreground">
              {isSpanish
                ? 'Restaurar archivos a sus ubicaciones originales.'
                : 'Restore files to their original locations.'}
            </p>
          </div>

          {showUndoConfirm ? (
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">
                {isSpanish ? '¿Estás seguro?' : 'Are you sure?'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={isUndoing}
              >
                {isUndoing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  isSpanish ? 'Sí, deshacer' : 'Yes, undo'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUndoConfirm(false)}
                disabled={isUndoing}
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowUndoConfirm(true)}
              >
                <Undo2 className="h-4 w-4" />
                {isSpanish ? 'Deshacer organización' : 'Undo organization'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
