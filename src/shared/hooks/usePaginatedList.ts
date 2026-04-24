import { useCallback, useMemo, useState } from 'react';

interface PaginationSyncPayload {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export function usePaginatedList(initialPageSize = 50) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

  const syncPagination = useCallback((payload: PaginationSyncPayload) => {
    if (payload.page !== undefined) {
      setPage(payload.page);
    }
    if (payload.pageSize !== undefined) {
      setPageSize(payload.pageSize);
    }
    if (payload.total !== undefined) {
      setTotal(payload.total);
    }
    if (payload.totalPages !== undefined) {
      setTotalPages(Math.max(1, payload.totalPages));
    }
  }, []);

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      total,
      totalPages,
    }),
    [page, pageSize, total, totalPages]
  );

  return {
    ...pagination,
    setPage,
    setPageSize,
    setTotal,
    setTotalPages,
    resetPagination,
    syncPagination,
  };
}
