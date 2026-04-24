import type { ReactNode } from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../lib/cn';

interface EmptyStateProps {
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'Nothing to display',
  message = 'There is no data available for this section yet.',
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('shadow-soft', className)}>
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        {action ? <div className="flex items-center justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
