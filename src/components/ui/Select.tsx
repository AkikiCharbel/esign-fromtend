import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          <select
            className={cn(
              'flex h-9 w-full appearance-none rounded-md border bg-surface px-3 py-1 pr-8 text-sm text-text-primary shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-danger' : 'border-border',
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export { Select };
export type { SelectProps };
