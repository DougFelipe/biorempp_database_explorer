import { useEffect, useMemo, useState } from 'react';
import type {
  GuidedCatalogResponse,
  GuidedQueryDefinition,
} from '@/features/guided-analysis/types';

interface UseGuidedQuerySelectionResult {
  selectedQueryId: string;
  setSelectedQueryId: (queryId: string) => void;
  selectedQuery: GuidedQueryDefinition | null;
}

export function useGuidedQuerySelection(
  catalog: GuidedCatalogResponse | null
): UseGuidedQuerySelectionResult {
  const [selectedQueryId, setSelectedQueryId] = useState('');

  const selectedQuery = useMemo(
    () => catalog?.queries.find((query) => query.id === selectedQueryId) || null,
    [catalog, selectedQueryId]
  );

  useEffect(() => {
    if (!catalog?.queries.length) {
      setSelectedQueryId('');
      return;
    }

    setSelectedQueryId((current) => {
      if (catalog.queries.some((query) => query.id === current)) {
        return current;
      }

      return catalog.queries[0]?.id || '';
    });
  }, [catalog]);

  return {
    selectedQueryId,
    setSelectedQueryId,
    selectedQuery,
  };
}
