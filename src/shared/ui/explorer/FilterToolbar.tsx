import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface FilterToolbarProps {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FilterToolbar({ actions, children, className }: FilterToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
