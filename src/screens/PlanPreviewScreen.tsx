import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState, PlanItem } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  FileText,
  Folder,
  FolderOpen,
  FlaskConical,
  ArrowRight,
  MapPin,
  Expand,
  Minimize2,
} from 'lucide-react';

interface FolderNode {
  name: string;
  path: string;
  files: PlanItem[];
  children: Map<string, FolderNode>;
}

export function PlanPreviewScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppState();
  const [excludedFiles, setExcludedFiles] = useState<Set<number>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const plan = state.currentPlan;

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No plan available</p>
      </div>
    );
  }

  // Get the base destination path
  const destinationBase = useMemo(() => {
    if (plan.items.length === 0) return 'Documents\\Organized Files';
    const firstDest = plan.items[0].destination_path;
    // Extract the base path (everything before the category folder)
    const parts = firstDest.split(/[\\/]/);
    // Find "Organized Files" in the path and return up to that point
    const orgIndex = parts.findIndex(p => p === 'Organized Files');
    if (orgIndex >= 0) {
      return parts.slice(0, orgIndex + 1).join('\\');
    }
    return parts.slice(0, -2).join('\\');
  }, [plan.items]);

  // Build folder tree structure from plan items (show ALL files, not just active)
  const folderTree = useMemo(() => {
    const root: FolderNode = {
      name: 'Organized Files',
      path: 'root',
      files: [],
      children: new Map()
    };

    // Show ALL files in tree, not just active ones (excluded files will show unchecked)
    for (const item of plan.items) {
      const destPath = item.destination_path;
      // Extract relative path after "Organized Files"
      const orgIndex = destPath.indexOf('Organized Files');
      const relativePath = orgIndex >= 0
        ? destPath.substring(orgIndex + 'Organized Files'.length + 1)
        : destPath;

      const parts = relativePath.split(/[\\/]/).filter(p => p.length > 0);

      // Remove the filename from parts (we add the file to current folder at the end)
      parts.pop();

      // Navigate/create folder structure
      let current = root;
      let currentPath = 'root';

      for (const part of parts) {
        currentPath += '/' + part;
        if (!current.children.has(part)) {
          current.children.set(part, {
            name: part,
            path: currentPath,
            files: [],
            children: new Map()
          });
        }
        current = current.children.get(part)!;
      }

      // Add file to the final folder
      current.files.push(item);
    }

    return root;
  }, [plan.items, excludedFiles]);

  // Count files and folders
  const activeItemCount = plan.items.length - excludedFiles.size;
  const folderCount = plan.summary.folders_to_create.length;

  const handleBack = () => {
    dispatch({ type: 'CLEAR_PLAN' });
  };

  const handleExecute = async () => {
    if (state.testMode) {
      // In test mode, show what would happen
      const confirmation = window.confirm(
        `Test Mode Preview\n\n` +
        `${activeItemCount} files would be organized into:\n${destinationBase}\n\n` +
        `To actually move files, uncheck "Test Mode" on the previous screen.\n\n` +
        `Click OK to go back, or Cancel to stay here.`
      );
      if (confirmation) {
        dispatch({ type: 'CLEAR_PLAN' });
      }
      return;
    }

    // Navigate to ApplyingChangesScreen which handles execution
    dispatch({ type: 'START_EXECUTING' });
  };

  const toggleFileExclusion = (fileId: number) => {
    setExcludedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Collect all folder paths for expand/collapse all
  const getAllFolderPaths = useCallback((node: FolderNode): string[] => {
    let paths = [node.path];
    for (const child of node.children.values()) {
      paths = [...paths, ...getAllFolderPaths(child)];
    }
    return paths;
  }, []);

  const expandAll = useCallback(() => {
    const allPaths = getAllFolderPaths(folderTree);
    setExpandedFolders(new Set(allPaths));
  }, [folderTree, getAllFolderPaths]);

  const collapseAll = useCallback(() => {
    setExpandedFolders(new Set(['root']));
  }, []);

  // Recursive folder renderer
  const renderFolder = (node: FolderNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const hasChildren = node.children.size > 0 || node.files.length > 0;
    const totalFiles = countFilesInNode(node);

    return (
      <div key={node.path} style={{ marginLeft: depth * 16 }}>
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer ${depth === 0 ? 'font-medium' : ''}`}
          onClick={() => hasChildren && toggleFolder(node.path)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )}
          <span className="flex-1">{node.name}</span>
          <span className="text-xs text-muted-foreground">{totalFiles} files</span>
        </div>

        {isExpanded && (
          <div>
            {/* Render child folders */}
            {Array.from(node.children.values()).map(child => renderFolder(child, depth + 1))}

            {/* Render files in this folder */}
            {node.files.length > 0 && (
              <div style={{ marginLeft: (depth + 1) * 16 }}>
                {node.files.map(file => {
                  const isExcluded = excludedFiles.has(file.file_id);
                  return (
                    <div
                      key={file.file_id}
                      className={`flex items-center gap-2 py-1 px-2 text-sm hover:bg-muted/30 rounded ${
                        isExcluded ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'
                      }`}
                    >
                      <Checkbox
                        checked={!isExcluded}
                        onCheckedChange={() => toggleFileExclusion(file.file_id)}
                        className="h-3.5 w-3.5"
                      />
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate flex-1">{getFileName(file.source_path)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Count only active (non-excluded) files in a folder
  const countFilesInNode = (node: FolderNode): number => {
    let count = node.files.filter(f => !excludedFiles.has(f.file_id)).length;
    for (const child of node.children.values()) {
      count += countFilesInNode(child);
    }
    return count;
  };

  const getFileName = (path: string) => {
    return path.split(/[\\/]/).pop() || path;
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
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

        {/* Test mode banner */}
        {state.testMode && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="p-4 flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Test Mode Active
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No files will actually be moved. This is a preview only.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">
            Review Your Organization Plan
          </h1>
          <p className="text-muted-foreground">
            {plan.name}
          </p>
        </div>

        {/* Destination info */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Files will be organized to:
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-mono mt-1">
                  {destinationBase}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{activeItemCount}</p>
              <p className="text-sm text-muted-foreground">files to organize</p>
              {excludedFiles.size > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ({excludedFiles.size} excluded)
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={plan.summary.low_confidence > 0 ? 'border-yellow-300' : ''}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${plan.summary.low_confidence > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              <p className="text-2xl font-bold">{plan.summary.low_confidence}</p>
              <p className="text-sm text-muted-foreground">need review</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Folder className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{folderCount}</p>
              <p className="text-sm text-muted-foreground">folders to create</p>
            </CardContent>
          </Card>
        </div>

        {/* Folder structure preview */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                New Folder Structure
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={expandAll}
                >
                  <Expand className="h-3 w-3" />
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={collapseAll}
                >
                  <Minimize2 className="h-3 w-3" />
                  Collapse
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-3">
              Uncheck files you want to exclude from organization
            </p>
            <div className="border rounded-lg p-3 bg-muted/20 overflow-auto" style={{ maxHeight: 'calc(100vh - 500px)', minHeight: '200px' }}>
              {renderFolder(folderTree)}
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3 pt-4">
          <Button
            size="xl"
            className="w-full gap-2"
            onClick={handleExecute}
            disabled={activeItemCount === 0}
          >
            {state.testMode ? (
              <>
                <FlaskConical className="h-5 w-5" />
                Run Test (Preview Only)
              </>
            ) : (
              <>
                <ArrowRight className="h-5 w-5" />
                Organize {activeItemCount} Files
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleBack}
          >
            Go Back & Change Options
          </Button>
        </div>
      </div>
    </div>
  );
}
