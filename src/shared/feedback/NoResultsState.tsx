import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';

interface NoResultsStateProps {
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function NoResultsState({
  title = 'No matching results',
  message = 'Try broader filters or different search terms.',
  action,
  className,
}: NoResultsStateProps) {
  return <EmptyState title={title} message={message} action={action} className={className} />;
}
