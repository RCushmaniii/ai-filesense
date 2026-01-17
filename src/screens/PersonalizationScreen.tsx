/**
 * Personalization Screen (Step 4)
 *
 * Shows 4 onboarding questions after scan completes.
 * Q1: Multi-select (user roles)
 * Q2-Q4: Single-select (radio buttons)
 *
 * No auto-advance - user must click Next.
 * "Other" option available for Q1 if none fit.
 */

import { useState } from 'react';
import { useTranslation } from '@/i18n';
import {
  useAppState,
  UserRole,
  LookupStyle,
  FolderDepth,
  ArchivePolicy,
} from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import {
  User,
  Search,
  FolderTree,
  Archive,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

// Question 1 options - multi-select
const USER_ROLE_OPTIONS: { value: UserRole; labelKey: string }[] = [
  { value: 'parent', labelKey: 'personalization.q1.options.parent' },
  { value: 'student', labelKey: 'personalization.q1.options.student' },
  { value: 'teacher', labelKey: 'personalization.q1.options.teacher' },
  { value: 'office', labelKey: 'personalization.q1.options.office' },
  { value: 'freelancer', labelKey: 'personalization.q1.options.freelancer' },
  { value: 'business', labelKey: 'personalization.q1.options.business' },
  { value: 'retired', labelKey: 'personalization.q1.options.retired' },
  { value: 'creative', labelKey: 'personalization.q1.options.creative' },
];

// Question 2 options - single-select
const LOOKUP_STYLE_OPTIONS: { value: LookupStyle; labelKey: string; descKey: string }[] = [
  { value: 'topic', labelKey: 'personalization.q2.options.topic.label', descKey: 'personalization.q2.options.topic.desc' },
  { value: 'time', labelKey: 'personalization.q2.options.time.label', descKey: 'personalization.q2.options.time.desc' },
  { value: 'project', labelKey: 'personalization.q2.options.project.label', descKey: 'personalization.q2.options.project.desc' },
];

// Question 3 options - single-select with prominent labels
const FOLDER_DEPTH_OPTIONS: { value: FolderDepth; labelKey: string; descKey: string; bigLabel: string; bigLabelEs: string }[] = [
  { value: 'flat', labelKey: 'personalization.q3.options.flat.label', descKey: 'personalization.q3.options.flat.desc', bigLabel: 'Lightly Organized', bigLabelEs: 'Ligeramente Organizado' },
  { value: 'moderate', labelKey: 'personalization.q3.options.moderate.label', descKey: 'personalization.q3.options.moderate.desc', bigLabel: 'More Organized', bigLabelEs: 'Más Organizado' },
  { value: 'detailed', labelKey: 'personalization.q3.options.detailed.label', descKey: 'personalization.q3.options.detailed.desc', bigLabel: 'Fully Organized', bigLabelEs: 'Completamente Organizado' },
];

// Question 4 options - single-select
const ARCHIVE_POLICY_OPTIONS: { value: ArchivePolicy; labelKey: string; descKey: string }[] = [
  { value: 'keep', labelKey: 'personalization.q4.options.keep.label', descKey: 'personalization.q4.options.keep.desc' },
  { value: 'archive', labelKey: 'personalization.q4.options.archive.label', descKey: 'personalization.q4.options.archive.desc' },
];

export function PersonalizationScreen() {
  const { t, language } = useTranslation();
  const { state, dispatch } = useAppState();
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const totalQuestions = 4;

  // Get icon for current question
  const getQuestionIcon = () => {
    switch (currentQuestion) {
      case 0: return <User className="h-8 w-8 text-primary" />;
      case 1: return <Search className="h-8 w-8 text-primary" />;
      case 2: return <FolderTree className="h-8 w-8 text-primary" />;
      case 3: return <Archive className="h-8 w-8 text-primary" />;
      default: return <User className="h-8 w-8 text-primary" />;
    }
  };

  // Check if current question has valid answer
  const canProceed = () => {
    switch (currentQuestion) {
      case 0:
        // Q1: Must select at least one role
        return state.personalization.userRoles.length > 0;
      case 1:
        // Q2: Must select lookup style
        return state.personalization.lookupStyle !== null;
      case 2:
        // Q3: Must select folder depth
        return state.personalization.folderDepth !== null;
      case 3:
        // Q4: Must select archive policy
        return state.personalization.archivePolicy !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Last question - complete personalization
      dispatch({ type: 'COMPLETE_PERSONALIZATION' });
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // Toggle a user role (Q1 - multi-select)
  const handleToggleRole = (role: UserRole) => {
    dispatch({ type: 'TOGGLE_USER_ROLE', role });
  };

  // Set lookup style (Q2 - single-select)
  const handleSetLookupStyle = (style: LookupStyle) => {
    dispatch({ type: 'SET_LOOKUP_STYLE', lookupStyle: style });
  };

  // Set folder depth (Q3 - single-select)
  const handleSetFolderDepth = (depth: FolderDepth) => {
    dispatch({ type: 'SET_FOLDER_DEPTH', folderDepth: depth });
  };

  // Set archive policy (Q4 - single-select)
  const handleSetArchivePolicy = (policy: ArchivePolicy) => {
    dispatch({ type: 'SET_ARCHIVE_POLICY', archivePolicy: policy });
  };

  // Render Q1 - Multi-select user roles
  const renderQuestion1 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center mb-4">
        {t('personalization.q1.hint')}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {USER_ROLE_OPTIONS.map((option) => {
          const isSelected = state.personalization.userRoles.includes(option.value);
          return (
            <label
              key={option.value}
              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all hover:border-primary ${
                isSelected ? 'border-primary bg-primary/5' : 'bg-card'
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleRole(option.value)}
              />
              <span className={isSelected ? 'font-medium text-primary' : ''}>
                {t(option.labelKey)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  // Render Q2/Q4 - Standard single-select options
  const renderSingleSelect = (
    options: { value: string; labelKey: string; descKey: string }[],
    currentValue: string | null,
    onSelect: (value: string) => void
  ) => (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = currentValue === option.value;
        return (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all hover:border-primary ${
              isSelected ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => onSelect(option.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    isSelected ? 'border-primary' : 'border-muted-foreground/30'
                  }`}
                >
                  {isSelected && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-base font-medium ${isSelected ? 'text-primary' : ''}`}>
                    {t(option.labelKey)}
                  </p>
                  <p className="text-[15px] text-muted-foreground mt-1">
                    {t(option.descKey)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Render Q3 - Folder depth with prominent big labels
  const renderFolderDepthOptions = () => {
    const isSpanish = language === 'es-MX';
    return (
      <div className="space-y-3">
        {FOLDER_DEPTH_OPTIONS.map((option) => {
          const isSelected = state.personalization.folderDepth === option.value;
          const bigLabel = isSpanish ? option.bigLabelEs : option.bigLabel;
          return (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:border-primary ${
                isSelected ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => handleSetFolderDepth(option.value)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      isSelected ? 'border-primary' : 'border-muted-foreground/30'
                    }`}
                  >
                    {isSelected && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    {/* Big prominent label */}
                    <p className={`text-lg font-semibold ${isSelected ? 'text-primary' : ''}`}>
                      {bigLabel}
                    </p>
                    {/* Smaller subtitle from translations */}
                    <p className={`text-base mt-1 ${isSelected ? 'text-primary/80' : 'text-foreground'}`}>
                      {t(option.labelKey)}
                    </p>
                    {/* Description */}
                    <p className="text-[15px] text-muted-foreground mt-1">
                      {t(option.descKey)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Render current question content
  const renderQuestionContent = () => {
    switch (currentQuestion) {
      case 0:
        return renderQuestion1();
      case 1:
        return renderSingleSelect(
          LOOKUP_STYLE_OPTIONS,
          state.personalization.lookupStyle,
          handleSetLookupStyle as (value: string) => void
        );
      case 2:
        // Q3 uses special rendering with big labels
        return renderFolderDepthOptions();
      case 3:
        return renderSingleSelect(
          ARCHIVE_POLICY_OPTIONS,
          state.personalization.archivePolicy,
          handleSetArchivePolicy as (value: string) => void
        );
      default:
        return null;
    }
  };

  // Get question title key
  const getQuestionTitle = () => {
    return `personalization.q${currentQuestion + 1}.title`;
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto">
      <div className="max-w-lg w-full mx-auto space-y-8">
        {/* Stepper - Step 3 of 8: Personalize */}
        <Stepper steps={ORGANIZATION_STEPS} currentStep={2} />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {getQuestionIcon()}
            </div>
          </div>
          <p className="text-base text-muted-foreground">
            {t('personalization.questionOf', { current: currentQuestion + 1, total: totalQuestions })}
          </p>
          <h1 className="text-2xl font-semibold">
            {t(getQuestionTitle())}
          </h1>
        </div>

        {/* Question content */}
        {renderQuestionContent()}

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalQuestions }).map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full transition-colors ${
                idx === currentQuestion
                  ? 'bg-primary'
                  : idx < currentQuestion
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentQuestion === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            {currentQuestion === totalQuestions - 1 ? (
              t('personalization.finish')
            ) : (
              <>
                {t('common.next')}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
