import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface FilterGridProps {
  children: ReactNode;
  className?: string;
}

export function FilterGrid({ children, className }: FilterGridProps) {
  return <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>{children}</div>;
}
