/**
 * Dashboard Screen (Screen 10)
 *
 * Maintenance Mode for File Organization
 *
 * Purpose: The home base after initial organization
 * - A health monitor for your file system
 * - A lightweight control panel for ongoing automation
 * - The place users return to when something changes
 *
 * Design Philosophy:
 * "Everything is organized. This helps keep it that way."
 * If nothing is wrong, Screen 10 should feel almost boring.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { invoke } from '@tauri-apps/api/core';
import {
  CheckCircle2,
  AlertCircle,
  Folder,
  FolderOpen,
  Info,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
  FileText,
  Copy,
  PauseCircle,
  Clock,
  Undo2,
  Loader2,
} from 'lucide-react';

// The 11 guardrail folders in order
// Note: Display number (for UI) vs actual folder number (on disk) may differ
// Review is shown first (00) for visibility but its actual folder is "11 Review"
const GUARDRAIL_FOLDERS = [
  { id: 'Review', displayNumber: '00', folderNumber: '11', color: 'amber' },
  { id: 'Work', displayNumber: '01', folderNumber: '01', color: 'blue' },
  { id: 'Money', displayNumber: '02', folderNumber: '02', color: 'green' },
  { id: 'Home', displayNumber: '03', folderNumber: '03', color: 'orange' },
  { id: 'Health', displayNumber: '04', folderNumber: '04', color: 'red' },
  { id: 'Legal', displayNumber: '05', folderNumber: '05', color: 'purple' },
  { id: 'School', displayNumber: '06', folderNumber: '06', color: 'cyan' },
  { id: 'Family', displayNumber: '07', folderNumber: '07', color: 'pink' },
  { id: 'Clients', displayNumber: '08', folderNumber: '08', color: 'indigo' },
  { id: 'Projects', displayNumber: '09', folderNumber: '09', color: 'teal' },
  { id: 'Archive', displayNumber: '10', folderNumber: '10', color: 'slate' },
] as const;

// Folder info explanations
const FOLDER_INFO: Record<string, { purposeKey: string; signalsKey: string }> = {
  Review: { purposeKey: 'dashboard.folderInfo.review.purpose', signalsKey: 'dashboard.folderInfo.review.signals' },
  Work: { purposeKey: 'dashboard.folderInfo.work.purpose', signalsKey: 'dashboard.folderInfo.work.signals' },
  Money: { purposeKey: 'dashboard.folderInfo.money.purpose', signalsKey: 'dashboard.folderInfo.money.signals' },
  Home: { purposeKey: 'dashboard.folderInfo.home.purpose', signalsKey: 'dashboard.folderInfo.home.signals' },
  Health: { purposeKey: 'dashboard.folderInfo.health.purpose', signalsKey: 'dashboard.folderInfo.health.signals' },
  Legal: { purposeKey: 'dashboard.folderInfo.legal.purpose', signalsKey: 'dashboard.folderInfo.legal.signals' },
  School: { purposeKey: 'dashboard.folderInfo.school.purpose', signalsKey: 'dashboard.folderInfo.school.signals' },
  Family: { purposeKey: 'dashboard.folderInfo.family.purpose', signalsKey: 'dashboard.folderInfo.family.signals' },
  Clients: { purposeKey: 'dashboard.folderInfo.clients.purpose', signalsKey: 'dashboard.folderInfo.clients.signals' },
  Projects: { purposeKey: 'dashboard.folderInfo.projects.purpose', signalsKey: 'dashboard.folderInfo.projects.signals' },
  Archive: { purposeKey: 'dashboard.folderInfo.archive.purpose', signalsKey: 'dashboard.folderInfo.archive.signals' },
};

interface GuardrailCount {
  category: string;
  count: number;
  recentlyUpdated?: boolean;
  newFilesCount?: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  count: number;
  category: string;
  timestamp: string;
  reason?: string;
}

interface DashboardData {
  lastOrganized: string | null;
  guardrailCounts: GuardrailCount[];
  newFilesCount: number;
  duplicatesCount: number;
  automationEnabled: boolean;
  reviewFirstEnabled: boolean;
  autoArchiveEnabled: boolean;
  recentActivity: ActivityEntry[];
}

export function DashboardScreen() {
  const { t, language } = useTranslation();
  const { dispatch } = useAppState();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Dismissed attention cards
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());

  const isSpanish = language === 'es-MX';

  // Load dashboard data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get guardrail counts from backend
        const counts = await invoke<GuardrailCount[]>('get_category_breakdown');

        // For now, simulate other dashboard data
        // In production, these would come from backend
        setData({
          lastOrganized: new Date().toLocaleString(isSpanish ? 'es-MX' : 'en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
          guardrailCounts: counts,
          newFilesCount: 0, // Will come from file watcher
          duplicatesCount: 0, // Will come from backend
          automationEnabled: true,
          reviewFirstEnabled: false,
          autoArchiveEnabled: false,
          recentActivity: [],
        });
      } catch (err) {
        console.error('[Dashboard] Error loading data:', err);
        // Fallback with empty data
        setData({
          lastOrganized: null,
          guardrailCounts: [],
          newFilesCount: 0,
          duplicatesCount: 0,
          automationEnabled: true,
          reviewFirstEnabled: false,
          autoArchiveEnabled: false,
          recentActivity: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isSpanish]);

  const getLocalizedCategory = (category: string) => {
    return t(`categories.${category}`);
  };

  const getFolderCount = (folderId: string) => {
    const found = data?.guardrailCounts.find(
      (g) => g.category.toLowerCase() === folderId.toLowerCase()
    );
    return found?.count || 0;
  };

  const getFolderRecentlyUpdated = (folderId: string) => {
    const found = data?.guardrailCounts.find(
      (g) => g.category.toLowerCase() === folderId.toLowerCase()
    );
    return found?.recentlyUpdated || false;
  };

  const reviewCount = getFolderCount('Review');
  const totalFiles = data?.guardrailCounts.reduce((sum, g) => sum + g.count, 0) || 0;
  const hasFilesOrganized = totalFiles > 0;
  const needsAttention = reviewCount > 0 || (data?.newFilesCount || 0) > 0 || (data?.duplicatesCount || 0) > 0;

  const handleOrganizeNow = () => {
    dispatch({ type: 'RESET_SCAN' });
    dispatch({ type: 'SET_INTENT', intent: 'organize' });
  };

  const handleReviewNow = async () => {
    try {
      await invoke('open_folder', { path: 'Organized Files/11 Review' });
    } catch (err) {
      console.error('[Dashboard] Error opening Review folder:', err);
    }
  };

  const handleOpenFolder = async (folderId: string) => {
    const folder = GUARDRAIL_FOLDERS.find((f) => f.id === folderId);
    if (!folder) return;

    try {
      // Use folderNumber for actual disk path
      await invoke('open_folder', { path: `Organized Files/${folder.folderNumber} ${folderId}` });
    } catch (err) {
      console.error('[Dashboard] Error opening folder:', err);
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await invoke('undo_last_operation');
      dispatch({ type: 'RESET_SCAN' });
    } catch (error) {
      console.error('[Dashboard] Error undoing:', error);
    } finally {
      setIsUndoing(false);
      setShowUndoConfirm(false);
    }
  };

  const handleDismissCard = (cardId: string) => {
    setDismissedCards((prev) => new Set([...prev, cardId]));
  };

  const handleToggleAutomation = (enabled: boolean) => {
    setData((prev) => (prev ? { ...prev, automationEnabled: enabled } : prev));
    // In production, save to backend
  };

  const handleToggleReviewFirst = (enabled: boolean) => {
    setData((prev) => (prev ? { ...prev, reviewFirstEnabled: enabled } : prev));
    // In production, save to backend
  };

  const handleToggleAutoArchive = (enabled: boolean) => {
    setData((prev) => (prev ? { ...prev, autoArchiveEnabled: enabled } : prev));
    // In production, save to backend
  };

  const getFolderColorClasses = (color: string, _isHighlighted: boolean) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
      blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
      green: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
      red: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
      cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
      pink: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800' },
      indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
      teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
      slate: { bg: 'bg-slate-50 dark:bg-slate-950/30', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800' },
    };
    return colorMap[color] || colorMap.slate;
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto space-y-8">
        {/* Dashboard Title */}
        <h1 className="text-2xl font-semibold">
          {isSpanish ? 'Panel de AI FileSense' : 'AI FileSense Dashboard'}
        </h1>

        {/* A. Status & Health Summary (Top Strip) */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {needsAttention ? (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            <span className={`text-[15px] ${needsAttention ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}>
              {needsAttention ? t('dashboard.statusNeedsReview') : t('dashboard.statusOrganized')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[15px] text-muted-foreground">
              {data?.lastOrganized
                ? `${t('dashboard.lastOrganizedAt')} ${data.lastOrganized}`
                : t('dashboard.neverOrganized')}
            </p>
            {data?.automationEnabled && (
              <p className="text-[14px] text-muted-foreground">
                {t('dashboard.automationNote')}
              </p>
            )}
          </div>
        </div>

        {/* C. Attention Needed (Conditional Section) */}
        {needsAttention && (
          <div className="space-y-3">
            {/* Files to Review */}
            {reviewCount > 0 && !dismissedCards.has('review') && (
              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-[15px] font-medium text-amber-800 dark:text-amber-200">
                          {isSpanish
                            ? `${reviewCount} archivos necesitan revisión`
                            : `${reviewCount} files need review`}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleReviewNow}>
                            {t('dashboard.reviewNow')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissCard('review')}
                          >
                            {isSpanish ? 'Después' : 'Later'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-amber-500 hover:text-amber-700"
                      onClick={() => handleDismissCard('review')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* New Files Detected */}
            {(data?.newFilesCount || 0) > 0 && !dismissedCards.has('newFiles') && (
              <Card className="border-blue-200 dark:border-blue-900">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-[15px] font-medium">
                          {isSpanish
                            ? `${data?.newFilesCount} archivos nuevos detectados`
                            : `${data?.newFilesCount} new files detected`}
                        </p>
                        <p className="text-[14px] text-muted-foreground">
                          {t('dashboard.newFilesSubtext')}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleOrganizeNow}>
                            {t('dashboard.organizeNow')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissCard('newFiles')}
                          >
                            {isSpanish ? 'Después' : 'Later'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleDismissCard('newFiles')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Duplicates Found */}
            {(data?.duplicatesCount || 0) > 0 && !dismissedCards.has('duplicates') && (
              <Card className="border-purple-200 dark:border-purple-900">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-[15px] font-medium">
                          {isSpanish
                            ? `${data?.duplicatesCount} grupos de duplicados`
                            : `${data?.duplicatesCount} duplicate groups`}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            {t('dashboard.reviewDuplicates')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDismissCard('duplicates')}
                          >
                            {isSpanish ? 'Después' : 'Later'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleDismissCard('duplicates')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Automation Paused */}
            {!data?.automationEnabled && !dismissedCards.has('automationPaused') && (
              <Card className="border-slate-200 dark:border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <PauseCircle className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-[15px] font-medium">
                          {t('dashboard.automationPaused')}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAutomation(true)}
                        >
                          {t('dashboard.turnOnAutomation')}
                        </Button>
                      </div>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleDismissCard('automationPaused')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* B. Guardrail Folder Overview (Primary Area) */}
        <div className="space-y-4">
          <h2 className="text-[16px] font-medium">
            {t('dashboard.yourFolders')}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GUARDRAIL_FOLDERS.map((folder) => {
              const count = getFolderCount(folder.id);
              const recentlyUpdated = getFolderRecentlyUpdated(folder.id);
              const isReview = folder.id === 'Review';
              const isEmpty = count === 0;
              const isExpanded = expandedFolder === folder.id;
              const colors = getFolderColorClasses(folder.color, isReview && count > 0);

              return (
                <Card
                  key={folder.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isEmpty ? 'opacity-50' : ''
                  } ${isReview && count > 0 ? colors.border : ''}`}
                  onClick={() => setExpandedFolder(isExpanded ? null : folder.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          {folder.displayNumber}
                        </span>
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            isReview && count > 0 ? colors.bg : 'bg-muted'
                          }`}
                        >
                          <Folder
                            className={`h-4 w-4 ${
                              isReview && count > 0
                                ? colors.text
                                : 'text-muted-foreground'
                            }`}
                          />
                        </div>
                      </div>
                      <button
                        className="text-muted-foreground hover:text-foreground p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFolder(isExpanded ? null : folder.id);
                        }}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2">
                      <p
                        className={`font-medium text-[14px] ${
                          isReview && count > 0 ? colors.text : ''
                        }`}
                      >
                        {getLocalizedCategory(folder.id)}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {count} {isSpanish ? 'archivos' : 'files'}
                      </p>
                      {recentlyUpdated && (
                        <p className="text-[12px] text-primary mt-1">
                          {isSpanish ? 'Actualizado hoy' : 'Updated today'}
                        </p>
                      )}
                    </div>

                    {/* Expanded info */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <p className="text-[12px] text-muted-foreground">
                          {t(FOLDER_INFO[folder.id]?.purposeKey || 'dashboard.folderInfo.default.purpose')}
                        </p>
                        <button
                          className="text-[12px] text-primary hover:underline flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFolder(folder.id);
                          }}
                        >
                          <FolderOpen className="h-3 w-3" />
                          {isSpanish ? 'Abrir carpeta' : 'Open folder'}
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* D. Automation Controls */}
        <div className="space-y-4">
          <h2 className="text-[16px] font-medium">
            {t('dashboard.automationTitle')}
          </h2>

          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Auto-organize toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-medium">
                    {t('dashboard.autoOrganize')}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {t('dashboard.autoOrganizeDesc')}
                  </p>
                </div>
                <Switch
                  checked={data?.automationEnabled || false}
                  onCheckedChange={handleToggleAutomation}
                />
              </div>

              {/* Review first toggle */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <p className="text-[15px] font-medium">
                    {t('dashboard.reviewFirst')}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {t('dashboard.reviewFirstDesc')}
                  </p>
                </div>
                <Switch
                  checked={data?.reviewFirstEnabled || false}
                  onCheckedChange={handleToggleReviewFirst}
                />
              </div>

              {/* Auto-archive toggle */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <p className="text-[15px] font-medium">
                    {t('dashboard.autoArchive')}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {t('dashboard.autoArchiveDesc')}
                  </p>
                </div>
                <Switch
                  checked={data?.autoArchiveEnabled || false}
                  onCheckedChange={handleToggleAutoArchive}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* E. Activity & Transparency (Collapsible) */}
        <div className="space-y-3">
          <button
            className="flex items-center gap-2 text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setActivityExpanded(!activityExpanded)}
          >
            {activityExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {t('dashboard.activityTitle')}
          </button>

          {activityExpanded && (
            <Card>
              <CardContent className="p-4">
                {(data?.recentActivity?.length || 0) > 0 ? (
                  <div className="space-y-3">
                    {data?.recentActivity.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p>
                              {entry.count} {isSpanish ? 'archivos' : 'files'}{' '}
                              {entry.action === 'moved'
                                ? isSpanish
                                  ? 'movidos a'
                                  : 'moved to'
                                : isSpanish
                                ? 'dejados en'
                                : 'left in'}{' '}
                              <span className="font-medium">
                                {getLocalizedCategory(entry.category)}
                              </span>
                            </p>
                            {entry.reason && (
                              <button className="text-xs text-primary hover:underline">
                                {isSpanish ? '¿Por qué?' : 'Why?'}
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {entry.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-muted-foreground text-center py-4">
                    {t('dashboard.noRecentActivity')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Undo Section */}
        {hasFilesOrganized && (
          <div className="border-t pt-6 space-y-3">
            {showUndoConfirm ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {isSpanish ? '¿Deshacer la última organización?' : 'Undo last organization?'}
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
                  {t('dashboard.undoLastOrganization')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Organize Again Button (when nothing needs attention) */}
        {!needsAttention && hasFilesOrganized && (
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleOrganizeNow}
            >
              <RefreshCw className="h-4 w-4" />
              {t('dashboard.organizeAgain')}
            </Button>
          </div>
        )}

        {/* Error Banner (for system issues) */}
        {/* This would be conditionally rendered when there's a system error */}
      </div>
    </div>
  );
}
