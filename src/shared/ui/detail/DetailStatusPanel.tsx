import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/shared/feedback';
import { Button } from '@/shared/ui/button';

interface DetailStatusPanelProps {
  status: 'loading' | 'error' | 'not-found';
  title?: ReactNode;
  message?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function DetailStatusPanel({
  status,
  title,
  message,
  onBack,
  backLabel = 'Go back',
  onRetry,
  retryLabel = 'Try again',
  className,
}: DetailStatusPanelProps) {
  if (status === 'loading') {
    return <LoadingState title={title} message={message} className={className} />;
  }

  if (status === 'error') {
    return (
      <ErrorState
        title={title}
        message={message}
        actionLabel={onRetry ? retryLabel : onBack ? backLabel : undefined}
        onAction={onRetry || onBack}
        className={className}
      />
    );
  }

  return (
    <EmptyState
      title={title}
      message={message}
      action={
        onBack ? (
          <Button variant="outline" onClick={onBack}>
            {backLabel}
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}
