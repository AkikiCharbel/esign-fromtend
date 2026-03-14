import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-start">
      {steps.map((label, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <div key={label} className="flex items-start flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isCompleted && 'bg-success text-white',
                  isCurrent && 'ring-2 ring-accent bg-accent-subtle text-accent',
                  !isCompleted && !isCurrent && 'bg-surface-raised text-text-tertiary'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isCurrent ? 'text-accent' : isCompleted ? 'text-text-secondary' : 'text-text-tertiary'
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mt-4 mx-2 h-px flex-1 min-w-8',
                  i < currentStep ? 'bg-accent' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export { StepIndicator };
