/**
 * File Types Screen (Step 1)
 *
 * User selects which file types to organize.
 * This happens BEFORE folder selection.
 */

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import {
  FileText,
  File,
  FileSpreadsheet,
  Presentation,
  ChevronRight,
  Shield,
} from 'lucide-react';

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
    id: 'txt',
    extensions: ['txt', 'md', 'markdown'],
    icon: File,
    labelKey: 'folderSelection.fileTypes.txt',
    description: '.txt, .md',
  },
  {
    id: 'word',
    extensions: ['doc', 'docx'],
    icon: FileSpreadsheet,
    labelKey: 'folderSelection.fileTypes.word',
    description: '.doc, .docx',
  },
  {
    id: 'powerpoint',
    extensions: ['ppt', 'pptx'],
    icon: Presentation,
    labelKey: 'folderSelection.fileTypes.powerpoint',
    description: '.ppt, .pptx',
  },
] as const;

type FileTypeId = typeof FILE_TYPES[number]['id'];

export function FileTypesScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppState();

  // Initialize from state or default to all selected
  const [selectedTypes, setSelectedTypes] = useState<Set<FileTypeId>>(() => {
    if (state.selectedExtensions.length > 0) {
      // Map extensions back to type IDs
      const types = new Set<FileTypeId>();
      for (const ft of FILE_TYPES) {
        if (ft.extensions.some(ext => state.selectedExtensions.includes(ext))) {
          types.add(ft.id);
        }
      }
      return types;
    }
    return new Set(['pdf', 'txt', 'word', 'powerpoint']); // Default all selected
  });

  const handleToggle = (typeId: FileTypeId) => {
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

  const handleContinue = () => {
    // Convert selected types to extensions
    const extensions: string[] = [];
    for (const ft of FILE_TYPES) {
      if (selectedTypes.has(ft.id)) {
        extensions.push(...ft.extensions);
      }
    }

    // Save to state
    dispatch({ type: 'SET_SELECTED_EXTENSIONS', extensions });

    // Move to folder selection (set intent to organize)
    dispatch({ type: 'SET_INTENT', intent: 'organize' });
  };

  const canContinue = selectedTypes.size > 0;

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full space-y-8">
        {/* Stepper */}
        <Stepper steps={ORGANIZATION_STEPS} currentStep={0} />

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">
            {t('fileTypes.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('fileTypes.subtitle')}
          </p>
        </div>

        {/* File type cards */}
        <div className="space-y-3">
          {FILE_TYPES.map(ft => {
            const Icon = ft.icon;
            const isSelected = selectedTypes.has(ft.id);

            return (
              <Card
                key={ft.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary border-primary' : ''
                }`}
                onClick={() => handleToggle(ft.id)}
              >
                <CardContent className="p-4">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(ft.id)}
                    />
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t(ft.labelKey)}</p>
                      <p className="text-sm text-muted-foreground">{ft.description}</p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Safety note */}
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="p-4 flex gap-3">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200">
              {t('fileTypes.safetyNote')}
            </p>
          </CardContent>
        </Card>

        {/* Continue button */}
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          {t('common.next')}
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
