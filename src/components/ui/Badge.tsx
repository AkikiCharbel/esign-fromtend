import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-surface-raised text-text-secondary',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
        outline: 'border border-border text-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const dotColors: Record<string, string> = {
  default: 'bg-text-tertiary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  outline: 'bg-text-tertiary',
};

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', dotColors[variant ?? 'default'])} />
      {children}
    </span>
  );
}

function getSubmissionBadgeVariant(
  status: string
): 'default' | 'success' | 'warning' | 'danger' | 'outline' {
  switch (status) {
    case 'draft':
      return 'default';
    case 'sent':
      return 'outline';
    case 'pending':
      return 'warning';
    case 'questions':
      return 'danger';
    case 'signed':
    case 'completed':
      return 'success';
    default:
      return 'default';
  }
}

export { Badge, badgeVariants, getSubmissionBadgeVariant };
export type { BadgeProps };
