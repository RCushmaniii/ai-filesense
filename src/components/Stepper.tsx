/**
 * Stepper Component
 *
 * Shows multi-step progress indicator for the organization wizard.
 */

import { Check } from 'lucide-react';
import { useTranslation } from '@/i18n';

export interface Step {
  id: string;
  labelKey: string; // i18n key for the step label
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
  className?: string;
}

export function Stepper({ steps, currentStep, className = '' }: StepperProps) {
  const { t } = useTranslation();

  return (
    <div className={`w-full ${className}`}>
      {/* Step indicator text */}
      <p className="text-sm text-muted-foreground text-center mb-4">
        {t('stepper.stepOf', { current: currentStep + 1, total: steps.length })}
      </p>

      {/* Progress bar */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-colors
                  ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                  ${isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : ''}
                  ${isUpcoming ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* Connector line (except after last step) */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-8 h-0.5 mx-1
                    ${index < currentStep ? 'bg-primary' : 'bg-muted'}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step label */}
      <p className="text-sm font-medium text-center mt-3">
        {t(steps[currentStep]?.labelKey || '')}
      </p>
    </div>
  );
}

// Predefined steps for the organization wizard (5-step flow)
// Welcome and Dashboard don't show the stepper
export const ORGANIZATION_STEPS: Step[] = [
  { id: 'folders', labelKey: 'stepper.steps.folders' },
  { id: 'scan', labelKey: 'stepper.steps.scan' },
  { id: 'preview', labelKey: 'stepper.steps.preview' },
  { id: 'organize', labelKey: 'stepper.steps.organize' },
  { id: 'done', labelKey: 'stepper.steps.done' },
];
