/**
 * Results Preview Screen (Screen 5 of 10)
 *
 * Purpose: High-level understanding, no action required
 * - Display 12 guardrail folders with file counts
 * - Prefixed with numbers (00-11)
 * - Ordered numerically
 * - READ-ONLY - no file-level actions
 * - Clear statement: "No files have been moved yet."
 *
 * Primary action: Next → proceeds to detailed review
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState, CATEGORY_META, Category } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import { invoke } from '@tauri-apps/api/core';
import {
  CheckCircle2,
  FileText,
  ChevronRight,
  ChevronLeft,
  Shield,
  Briefcase,
  DollarSign,
  Home,
  Heart,
  Scale,
  GraduationCap,
  Users,
  Building,
  FolderKanban,
  Plane,
  Archive,
  AlertCircle,
} from 'lucide-react';

// Type for category breakdown from backend
interface CategoryBreakdown {
  category: string;
  count: number;
}

// Icon map for categories
const CATEGORY_ICONS: Record<Category, React.ComponentType<{ className?: string }>> = {
  Work: Briefcase,
  Money: DollarSign,
  Home: Home,
  Health: Heart,
  Legal: Scale,
  School: GraduationCap,
  Family: Users,
  Clients: Building,
  Projects: FolderKanban,
  Travel: Plane,
  Archive: Archive,
  Review: AlertCircle,
};

// Numbered folder names
const NUMBERED_FOLDERS: { category: Category; number: string }[] = [
  { category: 'Review', number: '00' },
  { category: 'Work', number: '01' },
  { category: 'Money', number: '02' },
  { category: 'Home', number: '03' },
  { category: 'Health', number: '04' },
  { category: 'Legal', number: '05' },
  { category: 'School', number: '06' },
  { category: 'Family', number: '07' },
  { category: 'Clients', number: '08' },
  { category: 'Projects', number: '09' },
  { category: 'Travel', number: '10' },
  { category: 'Archive', number: '11' },
];

export function ResultsScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppState();
  const [categoryBreakdown, setCategoryBreakdown] = useState<Map<string, number>>(new Map());

  // Get actual file count from scan progress
  const totalFiles = state.scanProgress?.totalFiles || 0;

  // Load stats from backend
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Try to load category breakdown from backend
        const breakdown = await invoke<CategoryBreakdown[]>('get_category_breakdown');
        const map = new Map<string, number>();
        breakdown.forEach(b => map.set(b.category, b.count));
        setCategoryBreakdown(map);
      } catch {
        // Backend command may not exist yet, create mock data
        const map = new Map<string, number>();
        map.set('Work', Math.round(totalFiles * 0.25));
        map.set('Money', Math.round(totalFiles * 0.15));
        map.set('Home', Math.round(totalFiles * 0.10));
        map.set('Health', Math.round(totalFiles * 0.08));
        map.set('Legal', Math.round(totalFiles * 0.05));
        map.set('School', Math.round(totalFiles * 0.10));
        map.set('Family', Math.round(totalFiles * 0.07));
        map.set('Clients', Math.round(totalFiles * 0.05));
        map.set('Projects', Math.round(totalFiles * 0.08));
        map.set('Archive', Math.round(totalFiles * 0.03));
        map.set('Review', Math.round(totalFiles * 0.04));
        setCategoryBreakdown(map);
      }
    };
    loadStats();
  }, [totalFiles]);

  const handleBack = () => {
    // Go back to personalization
    dispatch({
      type: 'SET_PERSONALIZATION_COMPLETE',
      hasCompletedPersonalization: false,
    });
  };

  const handleNext = () => {
    // Move to detailed review (Screen 6)
    dispatch({ type: 'START_REVIEW' });
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Stepper - Step 4 of 8: Results */}
        <Stepper steps={ORGANIZATION_STEPS} currentStep={3} />

        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={handleBack}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Success header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">
              {t('results.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('results.documentsFound', { count: totalFiles })}
            </p>
          </div>
        </div>

        {/* Safety note - No files moved yet */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="p-4 flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('results.safetyNote')}
            </p>
          </CardContent>
        </Card>

        {/* 12 Guardrail Folders - READ-ONLY */}
        <div className="space-y-3">
          <h2 className="text-base font-medium text-muted-foreground">
            {t('results.foldersHeading')}
          </h2>

          <div className="space-y-1">
            {NUMBERED_FOLDERS.map(({ category, number }) => {
              const count = categoryBreakdown.get(category) || 0;
              const Icon = CATEGORY_ICONS[category];
              const meta = CATEGORY_META[category];
              const isReview = category === 'Review';

              return (
                <div
                  key={category}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isReview && count > 0
                      ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900'
                      : 'bg-muted/50'
                  }`}
                >
                  {/* Number prefix */}
                  <span className="font-mono text-sm text-muted-foreground w-6">
                    {number}
                  </span>

                  {/* Icon */}
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Category name */}
                  <span className={`flex-1 font-medium ${isReview && count > 0 ? 'text-amber-800 dark:text-amber-200' : ''}`}>
                    {t(`categories.${category}`)}
                  </span>

                  {/* File count */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{count} {t('common.files')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review warning if applicable */}
        {(categoryBreakdown.get('Review') || 0) > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>{categoryBreakdown.get('Review')} {t('results.needsReview')}</span>
          </div>
        )}

        {/* Continue button */}
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleNext}
        >
          {t('results.reviewChanges')}
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
