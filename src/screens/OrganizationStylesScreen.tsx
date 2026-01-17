/**
 * Organization Styles Screen
 *
 * Shows three organization modes with detailed nested folder previews.
 * The preview shows TWO levels so users can see the real difference.
 */

import React from 'react';
import { useTranslation } from '@/i18n';
import { useAppState, OrganizationStyle, OrganizationPlan } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { invoke } from '@tauri-apps/api/core';
import {
  ChevronLeft,
  FolderHeart,
  Calendar,
  Sparkles,
  Folder,
  FolderOpen,
  ChevronRight,
  Loader2,
  Check,
} from 'lucide-react';

type StyleId = 'simple' | 'timeline' | 'smartGroups';

// Map frontend style IDs to backend enum values
const styleToBackend: Record<StyleId, OrganizationStyle> = {
  simple: 'simple',
  timeline: 'timeline',
  smartGroups: 'smart_groups',
};

interface FolderPreview {
  name: string;
  children?: string[];
}

interface StyleOption {
  id: StyleId;
  icon: React.ReactNode;
  color: string;
  folders: FolderPreview[];
}

// Detailed folder structures showing the 11-folder numbered system
const styleOptions: StyleOption[] = [
  {
    id: 'simple',
    icon: <FolderHeart className="h-6 w-6" />,
    color: 'bg-blue-500',
    folders: [
      { name: '01 Work', children: ['Resumes', 'Payslips', 'Training'] },
      { name: '02 Money', children: ['Banking', 'Taxes', 'Receipts'] },
      { name: '03 Home', children: ['Property', 'Utilities', 'Warranties'] },
      { name: '04 Health', children: ['Records', 'Prescriptions'] },
      { name: '05 Legal', children: ['Contracts', 'IDs', 'Licenses'] },
    ],
  },
  {
    id: 'timeline',
    icon: <Calendar className="h-6 w-6" />,
    color: 'bg-amber-500',
    folders: [
      { name: '2025', children: ['Q1', 'Q2', 'Q3', 'Q4'] },
      { name: '2024', children: ['Q1', 'Q2', 'Q3', 'Q4'] },
      { name: '2023', children: ['Full Year'] },
      { name: '10 Archive', children: ['Older'] },
    ],
  },
  {
    id: 'smartGroups',
    icon: <Sparkles className="h-6 w-6" />,
    color: 'bg-purple-500',
    folders: [
      { name: '08 Clients', children: ['Acme Corp', 'BigCo', 'StartupXYZ'] },
      { name: '09 Projects', children: ['Q4 Report', 'Website', 'Marketing'] },
      { name: '02 Money', children: ['Invoices', 'Expenses'] },
      { name: '10 Archive', children: ['Completed'] },
    ],
  },
];

function FolderTree({ folders }: { folders: FolderPreview[] }) {
  return (
    <div className="space-y-1 text-sm">
      {folders.map((folder) => (
        <div key={folder.name}>
          <div className="flex items-center gap-2 py-1">
            <FolderOpen className="h-4 w-4 text-amber-500" />
            <span className="font-medium">{folder.name}</span>
          </div>
          {folder.children && (
            <div className="ml-6 space-y-0.5 border-l border-muted pl-3">
              {folder.children.slice(0, 3).map((child) => (
                <div key={child} className="flex items-center gap-2 py-0.5 text-muted-foreground">
                  <Folder className="h-3 w-3" />
                  <span className="text-xs">{child}</span>
                </div>
              ))}
              {folder.children.length > 3 && (
                <span className="text-xs text-muted-foreground/70 pl-5">
                  +{folder.children.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface StyleCardProps {
  style: StyleOption;
  isSelected: boolean;
  onSelect: () => void;
}

function StyleCard({ style, isSelected, onSelect }: StyleCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg relative overflow-hidden ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-xl ${style.color} text-white flex items-center justify-center`}>
            {style.icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {t(`organizationStyles.${style.id}.name`)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(`organizationStyles.${style.id}.bestFor`)}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
          {t(`organizationStyles.${style.id}.description`)}
        </p>

        {/* Folder tree preview */}
        <div className="bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
          <FolderTree folders={style.folders} />
        </div>
      </CardContent>
    </Card>
  );
}

export function OrganizationStylesScreen() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppState();

  // Default to 'simple' selected
  const [selectedStyle, setSelectedStyle] = React.useState<StyleId>('simple');

  const handleSelectStyle = (style: StyleId) => {
    setSelectedStyle(style);
  };

  const handleBack = () => {
    dispatch({ type: 'CLEAR_PLAN' });
    dispatch({ type: 'SET_INTENT', intent: null });
  };

  const handleContinue = async () => {
    if (!selectedStyle) return;

    const backendStyle = styleToBackend[selectedStyle];
    dispatch({ type: 'SELECT_ORGANIZATION_STYLE', style: backendStyle });
    dispatch({ type: 'START_GENERATING_PLAN' });

    try {
      const plan = await invoke<OrganizationPlan>('generate_organization_plan', {
        style: backendStyle,
        basePath: null, // Use default Documents/Organized Files
      });
      dispatch({ type: 'SET_CURRENT_PLAN', plan });
    } catch (error) {
      console.error('Error generating plan:', error);
      dispatch({ type: 'SET_ERROR', error: String(error) });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-auto">
      <div className="max-w-5xl mx-auto w-full space-y-8">
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

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">
            {t('organizationStyles.title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('organizationStyles.subtitle')}
          </p>
        </div>

        {/* Style options - grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {styleOptions.map(style => (
            <StyleCard
              key={style.id}
              style={style}
              isSelected={selectedStyle === style.id}
              onSelect={() => handleSelectStyle(style.id)}
            />
          ))}
        </div>

        {/* Continue button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            className="gap-2 px-12"
            disabled={!selectedStyle || state.isGeneratingPlan}
            onClick={handleContinue}
          >
            {state.isGeneratingPlan ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('organizationStyles.generatingPlan')}
              </>
            ) : (
              <>
                {t('organizationStyles.continueToPreview')}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
