import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

interface DataTableProps {
  children: ReactNode;
  emptyMessage?: ReactNode;
  emptyTitle?: ReactNode;
  error?: ReactNode;
  footer?: ReactNode;
  isEmpty?: boolean;
  loading?: boolean;
  loadingMessage?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  summary?: ReactNode;
}

function StatusPanel({
  action,
  message,
  title,
}: {
  action?: ReactNode;
  message: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
      {action}
    </div>
  );
}

export function DataTable({
  children,
  emptyMessage = 'Try broader filters or clear the current constraints.',
  emptyTitle = 'No matching results',
  error,
  footer,
  isEmpty = false,
  loading = false,
  loadingMessage = 'Please wait while the results are loaded.',
  onRetry,
  retryLabel = 'Retry',
  summary,
}: DataTableProps) {
  return (
    <Card className="overflow-hidden">
      {summary}

      {loading ? (
        <StatusPanel title="Loading results" message={loadingMessage} />
      ) : error ? (
        <StatusPanel
          title="Unable to load results"
          message={error}
          action={
            onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : undefined
          }
        />
      ) : isEmpty ? (
        <StatusPanel title={emptyTitle} message={emptyMessage} />
      ) : (
        children
      )}

      {footer}
    </Card>
  );
}
