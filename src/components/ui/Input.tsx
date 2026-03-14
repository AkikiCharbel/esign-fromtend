import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon: LeftIcon, rightIcon: RightIcon, error, type, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {LeftIcon && (
            <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          )}
          <input
            type={type}
            className={cn(
              'flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm text-text-primary shadow-sm transition-colors',
              'placeholder:text-text-tertiary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-danger' : 'border-border',
              LeftIcon && 'pl-9',
              RightIcon && 'pr-9',
              className
            )}
            ref={ref}
            {...props}
          />
          {RightIcon && (
            <RightIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
export type { InputProps };
