import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface VisualizationEmptyStateProps {
  title?: ReactNode;
  message: ReactNode;
  className?: string;
}

export function VisualizationEmptyState({
  title = 'No visualization data available',
  message,
  className,
}: VisualizationEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center',
        className
      )}
    >
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}
