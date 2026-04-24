import type { ReactNode } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { cn } from '../lib/cn';

interface ErrorStateProps {
  title?: ReactNode;
  message?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Unable to load content',
  message = 'An unexpected error prevented the page from rendering correctly.',
  actionLabel,
  onAction,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('border-rose-200 shadow-soft', className)}>
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div className="space-y-1">
          <p className="text-base font-semibold text-rose-700">{title}</p>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        {actionLabel && onAction ? (
          <Button variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
