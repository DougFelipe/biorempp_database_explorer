import { useEffect, useMemo, useState } from 'react';
import { getGuidedQueryOptions } from '@/features/guided-analysis/api';
import type {
  GuidedFilterOption,
  GuidedFilterState,
  GuidedQueryDefinition,
} from '@/features/guided-analysis/types';
import { serializeFiltersForOptions } from '@/features/guided-analysis/utils';

interface UseGuidedQueryOptionsResult {
  optionsByFilter: Record<string, GuidedFilterOption[]>;
  optionsLoading: boolean;
  optionsError: string | null;
  optionsReadyForQueryId: string;
}

export function useGuidedQueryOptions(
  query: GuidedQueryDefinition | null,
  filters: GuidedFilterState,
  enabled = true
): UseGuidedQueryOptionsResult {
  const [optionsByFilter, setOptionsByFilter] = useState<Record<string, GuidedFilterOption[]>>({});
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsReadyForQueryId, setOptionsReadyForQueryId] = useState('');

  const serializedFilters = useMemo(() => serializeFiltersForOptions(filters), [filters]);
  const serializedFiltersKey = useMemo(() => JSON.stringify(serializedFilters), [serializedFilters]);

  useEffect(() => {
    if (!query || !enabled) {
      setOptionsByFilter({});
      setOptionsLoading(false);
      setOptionsError(null);
      setOptionsReadyForQueryId(query && !enabled ? '' : query?.id || '');
      return;
    }

    const queryId = query.id;
    let cancelled = false;

    setOptionsLoading(true);
    setOptionsError(null);
    setOptionsReadyForQueryId('');

    async function loadOptions() {
      try {
        const response = await getGuidedQueryOptions(queryId, serializedFilters);
        if (cancelled) {
          return;
        }
        setOptionsByFilter(response.options);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setOptionsByFilter({});
        setOptionsError(error instanceof Error ? error.message : 'Unable to load filter options.');
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
          setOptionsReadyForQueryId(queryId);
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [enabled, query, serializedFilters, serializedFiltersKey]);

  return {
    optionsByFilter,
    optionsLoading,
    optionsError,
    optionsReadyForQueryId,
  };
}
