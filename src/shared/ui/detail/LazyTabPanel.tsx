import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/shared/feedback';
import type { LazyTabDataState } from '@/shared/hooks/useLazyTabData';
import { cn } from '@/shared/lib/cn';

interface LazyTabPanelProps<T> {
  state: LazyTabDataState<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  loadingTitle?: ReactNode;
  loadingMessage?: ReactNode;
  emptyTitle?: ReactNode;
  emptyMessage?: ReactNode;
  errorTitle?: ReactNode;
  retryLabel?: string;
  className?: string;
}

export function LazyTabPanel<T>({
  state,
  children,
  isEmpty,
  loadingTitle,
  loadingMessage,
  emptyTitle,
  emptyMessage,
  errorTitle,
  retryLabel = 'Try again',
  className,
}: LazyTabPanelProps<T>) {
  if (state.loading && !state.data) {
    return <LoadingState title={loadingTitle} message={loadingMessage} className={className} />;
  }

  if (state.error && !state.data) {
    return (
      <ErrorState
        title={errorTitle}
        message={state.error}
        actionLabel={retryLabel}
        onAction={state.reload}
        className={className}
      />
    );
  }

  if (!state.data || (isEmpty ? isEmpty(state.data) : false)) {
    return <EmptyState title={emptyTitle} message={emptyMessage} className={className} />;
  }

  return <div className={cn('space-y-4', className)}>{children(state.data)}</div>;
}
