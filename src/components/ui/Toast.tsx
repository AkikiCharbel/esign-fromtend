import { X, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  variant: ToastVariant;
  onDismiss: (id: string) => void;
}

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; containerClass: string; iconClass: string }> = {
  success: {
    icon: CheckCircle2,
    containerClass: 'border-success/30 bg-success-subtle',
    iconClass: 'text-success',
  },
  error: {
    icon: XCircle,
    containerClass: 'border-danger/30 bg-danger-subtle',
    iconClass: 'text-danger',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'border-warning/30 bg-warning-subtle',
    iconClass: 'text-warning',
  },
};

function Toast({ id, message, variant, onDismiss }: ToastProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm',
        'animate-in slide-in-from-bottom-4 fade-in-0 duration-300',
        config.containerClass
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', config.iconClass)} />
      <p className="text-sm text-text-primary flex-1">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export { Toast };
export type { ToastVariant, ToastProps };
