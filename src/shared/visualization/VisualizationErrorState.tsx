import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui';

interface VisualizationErrorStateProps {
  title?: ReactNode;
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function VisualizationErrorState({
  title = 'Unable to render visualization',
  message,
  actionLabel,
  onAction,
  className,
}: VisualizationErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center',
        className
      )}
    >
      <p className="text-sm font-medium text-rose-700">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
