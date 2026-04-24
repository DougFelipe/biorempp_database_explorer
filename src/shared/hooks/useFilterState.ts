import { useCallback, useMemo, useRef, useState } from 'react';

function isActiveFilterValue(value: unknown) {
  return value !== undefined && value !== null && value !== '';
}

export function useFilterState<TFilters extends object>(initialFilters: TFilters) {
  const initialFiltersRef = useRef(initialFilters);
  const [filters, setFilters] = useState<TFilters>(initialFilters);

  const setFilterValue = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K] | undefined) => {
    setFilters((currentFilters) => {
      if (!isActiveFilterValue(value)) {
        const nextFilters = { ...currentFilters } as Record<string, unknown>;
        delete nextFilters[key as string];
        return nextFilters as TFilters;
      }

      return {
        ...currentFilters,
        [key]: value,
      } as TFilters;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFiltersRef.current);
  }, []);

  const replaceFilters = useCallback((nextFilters: TFilters) => {
    setFilters(nextFilters);
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters as Record<string, unknown>).filter(isActiveFilterValue).length;
  }, [filters]);

  return {
    activeFilterCount,
    filters,
    replaceFilters,
    resetFilters,
    setFilterValue,
    setFilters,
  };
}
