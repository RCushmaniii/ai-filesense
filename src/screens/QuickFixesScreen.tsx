/**
 * Quick Clarifications Screen (Screen 7 of 10)
 *
 * Purpose: Resolve ambiguities that block high-confidence organization
 * - Reduce 00_Review size
 * - Prevent misclassification of sensitive/high-cost mistakes
 * - Confirm hierarchy when both Project and Client structures are plausible
 * - Clarify "what is this set of files?" when names/metadata don't provide context
 *
 * Rules:
 * - 0-5 questions total
 * - Max 1 freeform text question
 * - Max 2 multi-select questions
 * - All questions answerable in <10 seconds
 *
 * Question order (highest impact first):
 * 1. Safety/high-risk ambiguity (Legal/Health/Identity)
 * 2. Hierarchy choice (Client vs Project)
 * 3. Labeling (what is this called?)
 * 4. Bulk intent (files belong together vs split)
 * 5. Duplicate resolution (only if user opted in)
 *
 * Primary action: Continue → proceeds to Applying Changes (Screen 8)
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Stepper, ORGANIZATION_STEPS } from '@/components/Stepper';
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileText,
  Folder,
  ChevronDown,
  ChevronUp,
  Sparkles,
  SkipForward,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Types matching backend ClarificationQuestion
interface QuestionOption {
  id: string;
  label_en: string;
  label_es: string;
  is_recommended: boolean;
  is_skip: boolean;
  target_category: string | null;
}

interface CandidateDestination {
  category: string;
  confidence: number;
}

interface ClarificationQuestion {
  id: string;
  question_type: 'single-select' | 'multi-select' | 'text-input' | 'yes-no';
  question_en: string;
  question_es: string;
  why_en: string;
  why_es: string;
  options: QuestionOption[] | null;
  placeholder: string | null;
  suggestion: string | null;
  max_selections: number | null;
  affected_file_ids: number[];
  affected_filenames: string[];
  candidate_destinations: CandidateDestination[];
  priority: number;
}

// Personalization input matching backend PersonalizationInput
interface PersonalizationInput {
  user_roles: string[];
  lookup_style: string | null;
  folder_depth: string | null;
  archive_policy: string | null;
}

export function QuickFixesScreen() {
  const { t, language } = useTranslation();
  const { state, dispatch } = useAppState();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [textInputValue, setTextInputValue] = useState('');
  const [showContext, setShowContext] = useState(true);
  const [multiSelectValues, setMultiSelectValues] = useState<Set<string>>(new Set());

  // Loading and error states
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSpanish = language === 'es-MX';

  // Load questions from backend on mount
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get personalization data from app state
      const personalization: PersonalizationInput = {
        user_roles: state.personalization.userRoles,
        lookup_style: state.personalization.lookupStyle,
        folder_depth: state.personalization.folderDepth,
        archive_policy: state.personalization.archivePolicy,
      };

      const result = await invoke<ClarificationQuestion[]>('get_clarification_questions', {
        personalization,
      });

      setQuestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // Restore previous answer if exists
      const prevQuestion = questions[currentIndex - 1];
      const prevAnswer = answers.get(prevQuestion.id);
      if (prevQuestion.question_type === 'text-input' && typeof prevAnswer === 'string') {
        setTextInputValue(prevAnswer);
      } else if (prevQuestion.question_type === 'multi-select' && Array.isArray(prevAnswer)) {
        setMultiSelectValues(new Set(prevAnswer));
      }
    } else {
      // Go back to Review & Exclusions (Screen 6)
      dispatch({ type: 'START_REVIEW' });
    }
  };

  const handleSelect = async (optionId: string) => {
    const option = currentQuestion.options?.find(o => o.id === optionId);

    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(currentQuestion.id, optionId);
      return next;
    });

    // Apply the answer to backend
    if (option?.target_category) {
      try {
        await invoke('apply_clarification_answer', {
          questionId: currentQuestion.id,
          answer: optionId,
          fileIds: currentQuestion.affected_file_ids,
          targetCategory: option.target_category,
        });
      } catch {
        // Silently continue if answer application fails
      }
    }

    advanceToNext();
  };

  const handleMultiSelect = (optionId: string) => {
    const maxSelections = currentQuestion.max_selections || 2;
    setMultiSelectValues((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) {
        next.delete(optionId);
      } else if (next.size < maxSelections) {
        next.add(optionId);
      }
      return next;
    });
  };

  const handleMultiSelectContinue = async () => {
    if (multiSelectValues.size > 0) {
      const selectedIds = Array.from(multiSelectValues);
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQuestion.id, selectedIds);
        return next;
      });

      // Apply multi-select answer (use first selection's category for now)
      const firstOption = currentQuestion.options?.find(o => selectedIds.includes(o.id));
      if (firstOption?.target_category) {
        try {
          await invoke('apply_clarification_answer', {
            questionId: currentQuestion.id,
            answer: selectedIds.join(','),
            fileIds: currentQuestion.affected_file_ids,
            targetCategory: firstOption.target_category,
          });
        } catch {
          // Silently continue if answer application fails
        }
      }

      setMultiSelectValues(new Set());
      advanceToNext();
    }
  };

  const handleTextSubmit = async () => {
    if (textInputValue.trim()) {
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQuestion.id, textInputValue.trim());
        return next;
      });

      // For text input, we might create a subfolder with that name
      // The backend will handle this
      try {
        await invoke('apply_clarification_answer', {
          questionId: currentQuestion.id,
          answer: textInputValue.trim(),
          fileIds: currentQuestion.affected_file_ids,
          targetCategory: null, // Text answers don't change category directly
        });
      } catch {
        // Silently continue if answer application fails
      }

      setTextInputValue('');
      advanceToNext();
    }
  };

  const handleUseSuggestion = () => {
    if (currentQuestion.suggestion) {
      setTextInputValue(currentQuestion.suggestion);
    }
  };

  const handleSkip = () => {
    advanceToNext();
  };

  const handleSkipAll = () => {
    handleContinue();
  };

  const advanceToNext = () => {
    if (isLastQuestion) {
      handleContinue();
    } else {
      setCurrentIndex(currentIndex + 1);
      setTextInputValue('');
      setMultiSelectValues(new Set());
    }
  };

  const handleContinue = async () => {
    // Generate the organization plan before navigating to execution
    try {
      // Map folderDepth to organization style:
      // - 'flat' -> 'simple' (main categories only)
      // - 'moderate' -> 'simple' (categories + basic subcategories)
      // - 'detailed' -> 'smart_groups' (full AI-suggested paths with projects/clients)
      let style = 'simple';
      if (state.personalization.folderDepth === 'detailed') {
        style = 'smart_groups';
      } else if (state.personalization.lookupStyle === 'time') {
        style = 'timeline';
      }

      const plan = await invoke<{
        id: string;
        name: string;
        style: string;
        items: Array<{
          file_id: number;
          source_path: string;
          destination_path: string;
          confidence: number;
          reason: string;
          requires_review: boolean;
        }>;
        summary: {
          total_files: number;
          high_confidence: number;
          low_confidence: number;
          duplicates_found: number;
          folders_to_create: string[];
        };
      }>('generate_organization_plan', {
        style,
        basePath: null, // Use default Documents/Organized Files
        folderDepth: state.personalization.folderDepth, // Pass to backend
      });

      // Store the plan in state
      dispatch({ type: 'SET_CURRENT_PLAN', plan });

      // Navigate to Applying Changes (Screen 8)
      dispatch({ type: 'COMPLETE_CLARIFICATIONS' });
    } catch (error) {
      console.error('Error generating plan:', error);
      // Still continue to execution - it will handle the error
      dispatch({ type: 'COMPLETE_CLARIFICATIONS' });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="max-w-2xl mx-auto">
            <Stepper steps={ORGANIZATION_STEPS} currentStep={5} />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <h1 className="text-xl font-semibold">{t('quickFixes.analyzing')}</h1>
            <p className="text-muted-foreground">
              {t('quickFixes.generatingQuestions')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="max-w-2xl mx-auto">
            <Stepper steps={ORGANIZATION_STEPS} currentStep={5} />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">{t('quickFixes.errorTitle')}</h1>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => dispatch({ type: 'START_REVIEW' })}>
                {t('common.back')}
              </Button>
              <Button onClick={loadQuestions}>
                {t('common.retry')}
              </Button>
              <Button variant="secondary" onClick={handleContinue}>
                {t('quickFixes.skipAll')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no questions needed
  if (totalQuestions === 0) {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="max-w-2xl mx-auto">
            <Stepper steps={ORGANIZATION_STEPS} currentStep={5} />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="h-16 w-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-semibold">{t('quickFixes.noQuestionsNeeded')}</h1>
            <p className="text-muted-foreground">{t('quickFixes.allClear')}</p>
            <Button size="lg" className="gap-2" onClick={handleContinue}>
              {t('common.continue')}
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="max-w-2xl mx-auto">
          <Stepper steps={ORGANIZATION_STEPS} currentStep={5} />
        </div>
      </div>

      {/* Subheader */}
      <div className="border-b p-4 bg-muted/30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t('quickFixes.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('quickFixes.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {t('quickFixes.questionProgress', { current: currentIndex + 1, total: totalQuestions })}
            </span>
            <button className="p-1 text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>

          {/* Question card */}
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Question text */}
              <div className="space-y-2">
                <h2 className="text-lg font-medium">
                  {isSpanish ? currentQuestion.question_es : currentQuestion.question_en}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isSpanish ? currentQuestion.why_es : currentQuestion.why_en}
                </p>
              </div>

              {/* Context preview (collapsible) */}
              <div className="border rounded-lg">
                <button
                  className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50"
                  onClick={() => setShowContext(!showContext)}
                >
                  <span className="font-medium">
                    {t('quickFixes.thisAffects', { count: currentQuestion.affected_filenames.length })}
                  </span>
                  {showContext ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showContext && (
                  <div className="border-t p-3 space-y-3 bg-muted/20">
                    {/* Sample files */}
                    <div className="space-y-1">
                      {currentQuestion.affected_filenames.slice(0, 4).map((filename, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{filename}</span>
                        </div>
                      ))}
                      {currentQuestion.affected_filenames.length > 4 && (
                        <p className="text-xs text-muted-foreground pl-6">
                          +{currentQuestion.affected_filenames.length - 4} {t('quickFixes.moreFiles')}
                        </p>
                      )}
                    </div>

                    {/* Candidate destinations */}
                    {currentQuestion.candidate_destinations.length > 0 && (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          {t('quickFixes.candidateDestinations')}:
                        </p>
                        {currentQuestion.candidate_destinations.map((dest, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>{t(`categories.${dest.category}`)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({Math.round(dest.confidence * 100)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Answer controls based on question type */}
              {currentQuestion.question_type === 'single-select' && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border text-left transition-colors hover:border-primary hover:bg-primary/5 ${
                        option.is_skip ? 'opacity-70' : ''
                      }`}
                      onClick={() => handleSelect(option.id)}
                    >
                      <span className="font-medium">
                        {isSpanish ? option.label_es : option.label_en}
                      </span>
                      {option.is_recommended && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {t('quickFixes.recommended')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.question_type === 'multi-select' && currentQuestion.options && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t('quickFixes.chooseUpTo', { count: currentQuestion.max_selections || 2 })}
                  </p>
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => {
                      const isSelected = multiSelectValues.has(option.id);
                      return (
                        <button
                          key={option.id}
                          className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => handleMultiSelect(option.id)}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium">
                            {isSpanish ? option.label_es : option.label_en}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    className="w-full"
                    disabled={multiSelectValues.size === 0}
                    onClick={handleMultiSelectContinue}
                  >
                    {t('common.continue')}
                  </Button>
                </div>
              )}

              {currentQuestion.question_type === 'text-input' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      value={textInputValue}
                      onChange={(e) => setTextInputValue(e.target.value)}
                      placeholder={currentQuestion.placeholder || ''}
                      maxLength={50}
                      className="text-lg"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {textInputValue.length}/50
                    </p>
                  </div>

                  {currentQuestion.suggestion && (
                    <button
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm hover:bg-primary/20"
                      onClick={handleUseSuggestion}
                    >
                      <Sparkles className="h-3 w-3" />
                      {t('quickFixes.useSuggestion')}: {currentQuestion.suggestion}
                    </button>
                  )}

                  <Button
                    className="w-full"
                    disabled={!textInputValue.trim()}
                    onClick={handleTextSubmit}
                  >
                    {t('common.continue')}
                  </Button>
                </div>
              )}

              {currentQuestion.question_type === 'yes-no' && currentQuestion.options && (
                <div className="flex gap-3">
                  {currentQuestion.options.map((option) => (
                    <Button
                      key={option.id}
                      variant={option.id === 'yes' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => handleSelect(option.id)}
                    >
                      {isSpanish ? option.label_es : option.label_en}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skip this question link */}
          <div className="flex justify-center">
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={handleSkip}
            >
              <SkipForward className="h-4 w-4" />
              {t('quickFixes.skipQuestion')}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-background">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={handleSkipAll}
          >
            {t('quickFixes.skipAll')}
          </button>

          <p className="text-xs text-muted-foreground text-center flex-1 px-4">
            {t('quickFixes.reviewBeforeChanges')}
          </p>

          <div className="w-24" /> {/* Spacer to balance layout */}
        </div>
      </div>
    </div>
  );
}
