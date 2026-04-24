import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { TableCell } from '@/shared/ui/table';

interface RowLinkCellProps {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
}

export function RowLinkCell({ children, className, onClick, title }: RowLinkCellProps) {
  return (
    <TableCell className={cn('font-medium', className)}>
      <button
        type="button"
        onClick={onClick}
        title={title}
        className="text-accent underline-offset-4 transition-colors hover:text-blue-700 hover:underline"
      >
        {children}
      </button>
    </TableCell>
  );
}
