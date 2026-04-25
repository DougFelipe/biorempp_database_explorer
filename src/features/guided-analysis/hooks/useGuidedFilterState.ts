import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GuidedFilterState,
  GuidedFilterValue,
  GuidedQueryDefinition,
} from '@/features/guided-analysis/types';
import { buildDefaultFilterState } from '@/features/guided-analysis/utils';

interface UseGuidedFilterStateOptions {
  query: GuidedQueryDefinition | null;
}

interface UseGuidedFilterStateResult {
  filters: GuidedFilterState;
  isReady: boolean;
  replaceFilters: (nextFilters: GuidedFilterState) => void;
  handleFilterChange: (filterId: string, value: GuidedFilterValue) => void;
  handleResetFilters: () => void;
}

export function useGuidedFilterState({
  query,
}: UseGuidedFilterStateOptions): UseGuidedFilterStateResult {
  const queryId = query?.id || '';
  const [filters, setFilters] = useState<GuidedFilterState>({});
  const [initializedQueryId, setInitializedQueryId] = useState('');

  const defaultFilters = useMemo(() => buildDefaultFilterState(query), [query]);

  useEffect(() => {
    setFilters(defaultFilters);
    setInitializedQueryId(queryId);
  }, [defaultFilters, queryId]);

  function handleFilterChange(filterId: string, value: GuidedFilterValue) {
    setFilters((current) => ({
      ...current,
      [filterId]: value,
    }));
  }

  const replaceFilters = useCallback((nextFilters: GuidedFilterState) => {
    setFilters(nextFilters);
  }, []);

  function handleResetFilters() {
    setFilters(defaultFilters);
  }

  return {
    filters,
    isReady: !query || initializedQueryId === queryId,
    replaceFilters,
    handleFilterChange,
    handleResetFilters,
  };
}
