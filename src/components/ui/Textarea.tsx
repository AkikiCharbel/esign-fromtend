import * as React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, autoResize = false, onChange, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const handleResize = React.useCallback(() => {
      const el = innerRef.current;
      if (el && autoResize) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [autoResize]);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        handleResize();
        onChange?.(e);
      },
      [handleResize, onChange]
    );

    React.useEffect(() => {
      handleResize();
    }, [handleResize]);

    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm transition-colors',
            'placeholder:text-text-tertiary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            autoResize && 'resize-none overflow-hidden',
            error ? 'border-danger' : 'border-border',
            className
          )}
          ref={(el) => {
            innerRef.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) ref.current = el;
          }}
          onChange={handleChange}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
export type { TextareaProps };
