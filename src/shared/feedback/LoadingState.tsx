import type { ReactNode } from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../lib/cn';

interface LoadingStateProps {
  title?: ReactNode;
  message?: ReactNode;
  className?: string;
}

export function LoadingState({
  title = 'Loading content',
  message = 'Please wait while the page data is prepared.',
  className,
}: LoadingStateProps) {
  return (
    <Card className={cn('shadow-soft', className)}>
      <CardContent
        role="status"
        aria-live="polite"
        className="flex min-h-40 flex-col items-center justify-center gap-4 px-6 py-10 text-center"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-accent" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
