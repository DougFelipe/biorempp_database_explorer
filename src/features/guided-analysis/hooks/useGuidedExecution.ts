import { useEffect, useMemo, useRef, useState } from 'react';
import { executeGuidedQuery } from '@/features/guided-analysis/api';
import type {
  GuidedExecutionResponse,
  GuidedFilterState,
  GuidedQueryDefinition,
} from '@/features/guided-analysis/types';
import {
  getGuidedQueryPageSize,
  serializeFiltersForExecute,
} from '@/features/guided-analysis/utils';

interface PageState {
  scopeKey: string;
  page: number;
}

interface UseGuidedExecutionResult {
  execution: GuidedExecutionResponse | null;
  executionLoading: boolean;
  executionError: string | null;
  page: number;
  setPage: (page: number) => void;
}

export function useGuidedExecution(
  query: GuidedQueryDefinition | null,
  filters: GuidedFilterState,
  enabled = true
): UseGuidedExecutionResult {
  const [execution, setExecution] = useState<GuidedExecutionResponse | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<PageState>({ scopeKey: '', page: 1 });

  const serializedFilters = useMemo(() => serializeFiltersForExecute(filters), [filters]);
  const serializedFiltersKey = useMemo(() => JSON.stringify(serializedFilters), [serializedFilters]);
  const queryId = query?.id || '';
  const scopeKey = useMemo(
    () => `${queryId}::${serializedFiltersKey}`,
    [queryId, serializedFiltersKey]
  );
  const page = pageState.scopeKey === scopeKey ? pageState.page : 1;
  const previousQueryIdRef = useRef('');
  const requestedRequestKeyRef = useRef('');
  const completedRequestKeyRef = useRef('');
  const requestKey = `${scopeKey}::${page}`;

  useEffect(() => {
    if (!queryId) {
      previousQueryIdRef.current = '';
      requestedRequestKeyRef.current = '';
      completedRequestKeyRef.current = '';
      setExecution(null);
      setExecutionLoading(false);
      setExecutionError(null);
      return;
    }

    if (previousQueryIdRef.current && previousQueryIdRef.current !== queryId) {
      requestedRequestKeyRef.current = '';
      completedRequestKeyRef.current = '';
      setExecution(null);
      setExecutionLoading(false);
      setExecutionError(null);
    }

    previousQueryIdRef.current = queryId;
  }, [queryId]);

  useEffect(() => {
    if (pageState.scopeKey !== scopeKey) {
      setPageState({ scopeKey, page: 1 });
    }
  }, [pageState.scopeKey, scopeKey]);

  useEffect(() => {
    if (!query) {
      setExecutionLoading(false);
      setExecutionError(null);
      setExecution(null);
      return;
    }

    if (!enabled) {
      return;
    }

    if (
      completedRequestKeyRef.current === requestKey ||
      requestedRequestKeyRef.current === requestKey
    ) {
      return;
    }

    const activeQuery = query;
    let cancelled = false;
    requestedRequestKeyRef.current = requestKey;

    async function runExecution() {
      setExecutionLoading(true);
      setExecutionError(null);

      try {
        const response = await executeGuidedQuery(activeQuery.id, {
          page,
          pageSize: getGuidedQueryPageSize(activeQuery),
          filters: serializedFilters,
        });

        if (cancelled) {
          return;
        }

        setExecution(response);
        completedRequestKeyRef.current = requestKey;
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (requestedRequestKeyRef.current === requestKey) {
          requestedRequestKeyRef.current = '';
        }
        setExecutionError(error instanceof Error ? error.message : 'Unable to execute guided query.');
        setExecution(null);
      } finally {
        if (!cancelled && requestedRequestKeyRef.current === requestKey) {
          requestedRequestKeyRef.current = '';
        }
        if (!cancelled) {
          setExecutionLoading(false);
        }
      }
    }

    runExecution();

    return () => {
      cancelled = true;
      if (requestedRequestKeyRef.current === requestKey) {
        requestedRequestKeyRef.current = '';
      }
    };
  }, [enabled, page, query, requestKey, serializedFilters, scopeKey]);

  useEffect(() => {
    if (!execution?.table) {
      return;
    }

    if (page > execution.table.totalPages) {
      setPageState({ scopeKey, page: execution.table.totalPages });
    }
  }, [execution, page, scopeKey]);

  function setPage(nextPage: number) {
    setPageState({ scopeKey, page: nextPage });
  }

  return {
    execution,
    executionLoading,
    executionError,
    page,
    setPage,
  };
}
