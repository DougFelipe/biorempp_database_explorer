import type { ReactNode } from 'react';
import { EmptyState, LoadingState } from '@/shared/feedback';
import { cn } from '@/shared/lib/cn';
import { Card, CardContent } from '@/shared/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { Pagination } from '@/components/Pagination';

export interface EntityTableColumn<T> {
  key: string;
  header: ReactNode;
  cellClassName?: string;
  headClassName?: string;
  render: (row: T, index: number) => ReactNode;
}

interface EntityTableSectionProps<T> {
  rows: T[];
  columns: EntityTableColumn<T>[];
  getRowKey: (row: T, index: number) => string;
  loading: boolean;
  emptyTitle?: ReactNode;
  emptyMessage?: ReactNode;
  onRowClick?: (row: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
  tableClassName?: string;
}

export function EntityTableSection<T>({
  rows,
  columns,
  getRowKey,
  loading,
  emptyTitle,
  emptyMessage,
  onRowClick,
  pagination,
  className,
  tableClassName,
}: EntityTableSectionProps<T>) {
  if (loading) {
    return (
      <LoadingState
        title="Loading table"
        message="Please wait while the associated records are loaded."
        className={className}
      />
    );
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} className={className} />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="overflow-hidden rounded-2xl shadow-none">
        <CardContent className="px-0 pb-0 pt-0">
          <Table className={tableClassName}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.headClassName}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow
                  key={getRowKey(row, index)}
                  className={cn(onRowClick ? 'cursor-pointer focus-within:bg-blue-50 hover:bg-blue-50' : undefined)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.cellClassName}>
                      {column.render(row, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {pagination && pagination.totalPages > 1 ? (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.onPageChange}
        />
      ) : null}
    </div>
  );
}
