import { Pagination } from '@/components/Pagination';

interface PaginationFooterProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export function PaginationFooter({ currentPage, onPageChange, totalPages }: PaginationFooterProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="border-t border-slate-200 px-6 py-4">
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
