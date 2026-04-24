import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface ResultSummaryBarProps {
  actions?: ReactNode;
  className?: string;
  summary: ReactNode;
}

export function ResultSummaryBar({ actions, className, summary }: ResultSummaryBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-sm text-slate-600">{summary}</p>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
