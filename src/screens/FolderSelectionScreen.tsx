/**
 * Folder & File Type Selection Screen (Step 1 of 8)
 *
 * Combined setup screen:
 * - Select which folders to scan
 * - Select which file types to organize
 *
 * This is the first "step" in the workflow (after the landing page).
 */

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState, SelectedFolder } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import {
  Monitor,
  FileText,
  Download,
  FolderPlus,
  Shield,
  File,
  FileSpreadsheet,
  Database,
} from 'lucide-react';

// Type for scan status from backend
interface ScanStatus {
  total_files: number;
  classified_files: number;
  pending_classification: number;
  last_scan_at: string | null;
}

// Known folder IDs
const KNOWN_FOLDERS = {
  desktop: 'desktop',
  documents: 'documents',
  downloads: 'downloads',
};

// File types we support
const FILE_TYPES = [
  {
    id: 'pdf',
    extensions: ['pdf'],
    icon: FileText,
    labelKey: 'folderSelection.fileTypes.pdf',
    description: '.pdf',
  },
  {
    id: 'word',
    extensions: ['doc', 'docx'],
    icon: FileSpreadsheet,
    labelKey: 'folderSelection.fileTypes.word',
    description: '.doc, .docx',
  },
  {
    id: 'txt',
    extensions: ['txt'],
    icon: File,
    labelKey: 'folderSelection.fileTypes.txt',
    description: '.txt',
  },
] as const;

type FileTypeId = typeof FILE_TYPES[number]['id'];

// Type for known folder from backend
interface KnownFolderInfo {
  id: string;
  name: string;
  path: string;
}

interface FolderItemProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onToggle: () => void;
}

function FolderItem({ id, name, icon, isSelected, onToggle }: FolderItemProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-4 p-4 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
    >
      <Checkbox
        id={id}
        checked={isSelected}
        onCheckedChange={onToggle}
      />
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
        {icon}
      </div>
      <span className="font-medium">{name}</span>
    </label>
  );
}


export function FolderSelectionScreen() {
  const { t, language } = useTranslation();
  const { state, selectFolder, deselectFolder, startScan, dispatch } = useAppState();
  const [knownFolders, setKnownFolders] = useState<KnownFolderInfo[]>([]);

  // DEV ONLY: Use previous scan from database
  const [usePreviousScan, setUsePreviousScan] = useState(false);
  const [previousScanStatus, setPreviousScanStatus] = useState<ScanStatus | null>(null);

  const isSpanish = language === 'es-MX';

  // Load previous scan status from database
  useEffect(() => {
    const loadScanStatus = async () => {
      try {
        const status = await invoke<ScanStatus>('get_scan_status');
        setPreviousScanStatus(status);
      } catch (error) {
        console.error('Error loading scan status:', error);
      }
    };
    loadScanStatus();
  }, []);

  // Initialize file type selection state
  const [selectedTypes, setSelectedTypes] = useState<Set<FileTypeId>>(() => {
    if (state.selectedExtensions.length > 0) {
      const types = new Set<FileTypeId>();
      for (const ft of FILE_TYPES) {
        if (ft.extensions.some(ext => state.selectedExtensions.includes(ext))) {
          types.add(ft.id);
        }
      }
      return types;
    }
    return new Set(['pdf', 'word', 'txt']); // Default all selected
  });

  // Load known folder paths from Tauri backend
  useEffect(() => {
    const loadKnownFolders = async () => {
      try {
        const folders = await invoke<KnownFolderInfo[]>('get_known_folders');
        setKnownFolders(folders);

        // Initialize with known folders selected by default (only if not already selected)
        if (state.selectedFolders.length === 0) {
          folders.forEach(folder => {
            const selectedFolder: SelectedFolder = {
              id: folder.id,
              path: folder.path,
              name: t(`folderSelection.${folder.id}`),
              isKnownFolder: true,
            };
            selectFolder(selectedFolder);
          });
        }
      } catch (error) {
        console.error('Error loading known folders:', error);
      }
    };

    loadKnownFolders();
  }, []); // Only run once on mount

  // Helper to get path for a known folder
  const getKnownFolderPath = (folderId: string): string => {
    const folder = knownFolders.find(f => f.id === folderId);
    return folder?.path || '';
  };

  const handleToggleFileType = (typeId: FileTypeId) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('folderSelection.addFolder'),
      });

      if (selected && typeof selected === 'string') {
        const folderName = selected.split(/[\\/]/).pop() || selected;
        const newFolder: SelectedFolder = {
          id: `custom-${Date.now()}`,
          path: selected,
          name: folderName,
          isKnownFolder: false,
        };
        selectFolder(newFolder);
      }
    } catch (error) {
      console.error('Error opening folder picker:', error);
    }
  };

  const handleToggleFolder = (folderId: string) => {
    const isCurrentlySelected = state.selectedFolders.some(f => f.id === folderId);

    if (isCurrentlySelected) {
      deselectFolder(folderId);
    } else {
      // Re-add the known folder
      let name = '';
      switch (folderId) {
        case KNOWN_FOLDERS.desktop:
          name = t('folderSelection.desktop');
          break;
        case KNOWN_FOLDERS.documents:
          name = t('folderSelection.documents');
          break;
        case KNOWN_FOLDERS.downloads:
          name = t('folderSelection.downloads');
          break;
      }

      const folder: SelectedFolder = {
        id: folderId,
        path: getKnownFolderPath(folderId),
        name,
        isKnownFolder: true,
      };
      selectFolder(folder);
    }
  };

  const isFolderSelected = (folderId: string) => {
    return state.selectedFolders.some(f => f.id === folderId);
  };

  const handleStartScan = () => {
    // Convert selected types to extensions
    const extensions: string[] = [];
    for (const ft of FILE_TYPES) {
      if (selectedTypes.has(ft.id)) {
        extensions.push(...ft.extensions);
      }
    }

    // Save extensions to state
    dispatch({ type: 'SET_SELECTED_EXTENSIONS', extensions });

    // DEV ONLY: Skip scanning and use previous scan from database
    if (import.meta.env.DEV && usePreviousScan && previousScanStatus && previousScanStatus.total_files > 0) {
      // Set scan progress from database
      dispatch({
        type: 'UPDATE_SCAN_PROGRESS',
        progress: {
          filesFound: previousScanStatus.total_files,
          totalFiles: previousScanStatus.total_files,
          filesAnalyzed: previousScanStatus.classified_files,
        }
      });
      // Skip to AI_ANALYZED state
      dispatch({ type: 'COMPLETE_AI_ANALYSIS' });
      return;
    }

    if (state.selectedFolders.length > 0 && extensions.length > 0) {
      startScan();
    }
  };

  // Get custom (non-known) folders
  const customFolders = state.selectedFolders.filter(f => !f.isKnownFolder);

  const canStartScan = state.selectedFolders.length > 0 && selectedTypes.size > 0;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Stepper - Step 1 of 8: Choose Folders & File Types */}
        <Stepper steps={ORGANIZATION_STEPS} currentStep={0} />

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {t('folderSelection.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('folderSelection.explanation')}
          </p>
        </div>

        {/* Safety note */}
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="p-4 flex gap-3">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">
              {t('folderSelection.safetyNote')}
            </p>
          </CardContent>
        </Card>

        {/* Folders Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">
            {isSpanish ? '¿Dónde están tus archivos?' : 'Where are your files?'}
          </h2>

          <div className="space-y-3">
            <FolderItem
              id={KNOWN_FOLDERS.desktop}
              name={t('folderSelection.desktop')}
              icon={<Monitor className="h-5 w-5 text-muted-foreground" />}
              isSelected={isFolderSelected(KNOWN_FOLDERS.desktop)}
              onToggle={() => handleToggleFolder(KNOWN_FOLDERS.desktop)}
            />
            <FolderItem
              id={KNOWN_FOLDERS.documents}
              name={t('folderSelection.documents')}
              icon={<FileText className="h-5 w-5 text-muted-foreground" />}
              isSelected={isFolderSelected(KNOWN_FOLDERS.documents)}
              onToggle={() => handleToggleFolder(KNOWN_FOLDERS.documents)}
            />
            <FolderItem
              id={KNOWN_FOLDERS.downloads}
              name={t('folderSelection.downloads')}
              icon={<Download className="h-5 w-5 text-muted-foreground" />}
              isSelected={isFolderSelected(KNOWN_FOLDERS.downloads)}
              onToggle={() => handleToggleFolder(KNOWN_FOLDERS.downloads)}
            />

            {/* Custom folders */}
            {customFolders.map(folder => (
              <FolderItem
                key={folder.id}
                id={folder.id}
                name={folder.name}
                icon={<FolderPlus className="h-5 w-5 text-muted-foreground" />}
                isSelected={true}
                onToggle={() => deselectFolder(folder.id)}
              />
            ))}

            {/* Add folder button */}
            <Button
              variant="outline"
              className="w-full gap-2 h-12"
              onClick={handleAddFolder}
            >
              <FolderPlus className="h-5 w-5" />
              {t('folderSelection.addFolder')}
            </Button>
          </div>
        </div>

        {/* File Types Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">
            {t('folderSelection.fileTypesTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('folderSelection.fileTypesSubtitle')}
          </p>

          <div className="grid grid-cols-3 gap-3">
            {FILE_TYPES.map(ft => {
              const Icon = ft.icon;
              const isSelected = selectedTypes.has(ft.id);

              return (
                <Card
                  key={ft.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleToggleFileType(ft.id)}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{t(ft.labelKey)}</p>
                      <p className="text-xs text-muted-foreground">{ft.description}</p>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleFileType(ft.id)}
                      className="mt-1"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

        </div>

        {/* DEV ONLY: Use previous scan checkbox */}
        {import.meta.env.DEV && previousScanStatus && previousScanStatus.total_files > 0 && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={usePreviousScan}
                  onCheckedChange={(checked) => setUsePreviousScan(checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-800 dark:text-amber-200">
                      {isSpanish ? 'Usar escaneo anterior (DEV)' : 'Use previous scan (DEV)'}
                    </span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {isSpanish
                      ? `${previousScanStatus.total_files} archivos en la base de datos (${previousScanStatus.classified_files} clasificados)`
                      : `${previousScanStatus.total_files} files in database (${previousScanStatus.classified_files} classified)`}
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Free tier scans remaining warning (show when 3 or fewer scans left) */}
        {state.freeTier.scansRemaining <= 3 && state.freeTier.scansRemaining > 0 && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="p-4 flex gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('folderSelection.scansRemaining', { count: state.freeTier.scansRemaining })}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Free tier limit reached - show upgrade message */}
        {state.freeTier.isLimitReached && (
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <CardContent className="p-4 flex gap-3">
              <Shield className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {t('folderSelection.outOfScans')}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {t('folderSelection.upgradeToScan')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start scan button */}
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={handleStartScan}
          disabled={(!canStartScan && !usePreviousScan) || state.freeTier.isLimitReached}
        >
          {usePreviousScan
            ? (isSpanish ? 'Continuar con datos anteriores' : 'Continue with previous data')
            : t('folderSelection.startScan')}
        </Button>
      </div>
    </div>
  );
}
