/**
 * Review & Exclusions Screen (Screen 6 of 10)
 *
 * Purpose: User control before AI acts
 * - Two-panel layout:
 *   - Left: Full folder tree (with guardrail structure)
 *   - Right: File list
 * - Ability to:
 *   - Exclude files from organization
 *   - Exclude entire folders if needed
 * - Framing:
 *   - This is the last chance to exclude files
 *   - Clear reassurance: excluded files will remain untouched
 *
 * Primary action: Next → proceeds to Quick Clarifications (Screen 7)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState, Category, CATEGORY_META } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import {
  ChevronLeft,
  ChevronRight,
  Folder,
  FileText,
  Shield,
  EyeOff,
} from 'lucide-react';

// Numbered folder order (matches ResultsScreen)
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

// Mock file data for now - in production this comes from the plan
interface FileItem {
  id: number;
  filename: string;
  path: string;
  category: Category;
  confidence: number;
}

// Generate mock files for demo
function generateMockFiles(totalFiles: number): FileItem[] {
  const files: FileItem[] = [];
  const categories: Category[] = ['Work', 'Money', 'Home', 'Health', 'Legal', 'School', 'Family', 'Clients', 'Projects', 'Archive', 'Review'];
  const extensions = ['pdf', 'doc', 'docx', 'txt'];
  const prefixes = ['Invoice', 'Report', 'Contract', 'Letter', 'Statement', 'Receipt', 'Document', 'Notes', 'Summary', 'Plan'];

  for (let i = 0; i < totalFiles; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const ext = extensions[Math.floor(Math.random() * extensions.length)];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    files.push({
      id: i + 1,
      filename: `${prefix}_${2020 + Math.floor(Math.random() * 5)}_${i + 1}.${ext}`,
      path: `C:\\Users\\Documents\\${category}\\${prefix}_${i + 1}.${ext}`,
      category,
      confidence: 0.65 + Math.random() * 0.35,
    });
  }
  return files;
}

export function DetailedReviewScreen() {
  const { t, language } = useTranslation();
  const { state, dispatch } = useAppState();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [excludedFiles, setExcludedFiles] = useState<Set<number>>(new Set());
  const [excludedFolders, setExcludedFolders] = useState<Set<Category>>(new Set());
  const [testMode, setTestMode] = useState(false);
  const isSpanish = language === 'es-MX';

  // Get files from plan or generate mock data
  const totalFiles = state.scanProgress?.totalFiles || 50;
  const [files] = useState<FileItem[]>(() => generateMockFiles(totalFiles));

  // Group files by category
  const filesByCategory = files.reduce((acc, file) => {
    if (!acc[file.category]) {
      acc[file.category] = [];
    }
    acc[file.category].push(file);
    return acc;
  }, {} as Record<Category, FileItem[]>);

  // Get folders with file counts (only show folders that have files)
  const foldersWithFiles = NUMBERED_FOLDERS.filter(
    ({ category }) => filesByCategory[category]?.length > 0
  );

  // Select first folder by default
  useEffect(() => {
    if (foldersWithFiles.length > 0 && !selectedCategory) {
      setSelectedCategory(foldersWithFiles[0].category);
    }
  }, [foldersWithFiles, selectedCategory]);

  const handleBack = () => {
    dispatch({ type: 'START_RESULTS_PREVIEW' });
  };

  const handleContinue = () => {
    // Save test mode and excluded files/folders to state before continuing
    dispatch({ type: 'SET_TEST_MODE', testMode });
    dispatch({ type: 'COMPLETE_REVIEW' });
  };

  const toggleFileExclusion = (fileId: number) => {
    setExcludedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleFolderExclusion = (category: Category) => {
    setExcludedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
        // Also un-exclude all files in this folder
        const folderFiles = filesByCategory[category] || [];
        setExcludedFiles((prevFiles) => {
          const nextFiles = new Set(prevFiles);
          folderFiles.forEach((f) => nextFiles.delete(f.id));
          return nextFiles;
        });
      } else {
        next.add(category);
        // Also exclude all files in this folder
        const folderFiles = filesByCategory[category] || [];
        setExcludedFiles((prevFiles) => {
          const nextFiles = new Set(prevFiles);
          folderFiles.forEach((f) => nextFiles.add(f.id));
          return nextFiles;
        });
      }
      return next;
    });
  };

  const selectedFiles = selectedCategory ? filesByCategory[selectedCategory] || [] : [];
  const totalExcluded = excludedFiles.size;
  const totalIncluded = files.length - totalExcluded;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="max-w-4xl mx-auto">
          <Stepper steps={ORGANIZATION_STEPS} currentStep={4} />
        </div>
      </div>

      {/* Subheader with title and back button */}
      <div className="border-b p-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" className="gap-2 mb-4" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>

          <h1 className="text-xl font-semibold">{t('detailedReview.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('detailedReview.lastChance')}
          </p>
        </div>
      </div>

      {/* Safety reassurance */}
      <div className="p-4 bg-background border-b">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="p-3 flex gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('detailedReview.excludedRemainUntouched')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden max-w-6xl mx-auto w-full">
        {/* Left panel - Folder tree */}
        <div className="w-72 border-r bg-muted/20 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              {t('detailedReview.folders')}
            </h2>
            <div className="space-y-1">
              {foldersWithFiles.map(({ category, number }) => {
                const meta = CATEGORY_META[category];
                const isSelected = selectedCategory === category;
                const isExcluded = excludedFolders.has(category);
                const fileCount = filesByCategory[category]?.length || 0;
                const excludedInFolder = (filesByCategory[category] || []).filter(
                  (f) => excludedFiles.has(f.id)
                ).length;

                return (
                  <div
                    key={category}
                    className={`flex items-center gap-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted'
                    } ${isExcluded ? 'opacity-50' : ''}`}
                  >
                    {/* Exclude checkbox */}
                    <div className="pl-2">
                      <Checkbox
                        checked={!isExcluded}
                        onCheckedChange={() => toggleFolderExclusion(category)}
                        aria-label={`Include ${category} folder`}
                      />
                    </div>

                    {/* Folder button */}
                    <button
                      className="flex-1 flex items-center gap-2 px-2 py-2 text-left"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <span className="font-mono text-xs text-muted-foreground w-5">
                        {number}
                      </span>
                      <Folder
                        className="h-4 w-4"
                        style={{ color: meta.color }}
                      />
                      <span className="flex-1 text-sm truncate">
                        {t(`categories.${category}`)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {excludedInFolder > 0 ? (
                          <span className="text-amber-600">{fileCount - excludedInFolder}/{fileCount}</span>
                        ) : (
                          fileCount
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel - File list */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedCategory ? (
            <div className="space-y-3 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">
                  {t(`categories.${selectedCategory}`)} ({selectedFiles.length} {t('common.files')})
                </h2>
                {excludedFolders.has(selectedCategory) && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    {t('detailedReview.folderExcluded')}
                  </span>
                )}
              </div>

              {selectedFiles.map((file) => {
                const isExcluded = excludedFiles.has(file.id);

                return (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${
                      isExcluded ? 'opacity-50 bg-muted/50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={!isExcluded}
                      onCheckedChange={() => toggleFileExclusion(file.id)}
                      aria-label={`Include ${file.filename}`}
                    />
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isExcluded ? 'line-through' : ''}`}>
                        {file.filename}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {file.path}
                      </p>
                    </div>
                    {isExcluded && (
                      <span className="text-xs text-muted-foreground">
                        {t('detailedReview.excluded')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t('detailedReview.selectFolder')}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-background">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Test mode checkbox */}
          <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50">
            <Checkbox
              checked={testMode}
              onCheckedChange={(checked) => setTestMode(checked === true)}
            />
            <div>
              <p className="font-medium text-[15px]">
                {isSpanish ? 'Modo de prueba (solo vista previa)' : 'Test mode (preview only)'}
              </p>
              <p className="text-[14px] text-muted-foreground">
                {isSpanish
                  ? 'Ve lo que pasaría sin mover archivos realmente'
                  : 'See what would happen without actually moving files'}
              </p>
            </div>
          </label>

          <div className="flex items-center justify-between">
            <div className="text-[15px] text-muted-foreground">
              {totalExcluded > 0 ? (
                <span className="text-amber-600">
                  {totalExcluded} {t('detailedReview.filesExcluded')} • {totalIncluded} {t('detailedReview.willBeOrganized')}
                </span>
              ) : (
                <span>{totalIncluded} {t('detailedReview.filesWillBeOrganized')}</span>
              )}
            </div>

            <Button size="lg" className="gap-2" onClick={handleContinue}>
              {t('common.next')}
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
