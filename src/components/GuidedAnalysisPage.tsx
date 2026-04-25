import { useEffect, useMemo } from 'react';
import { QuerySelectorPanel } from '@/components/guided-analysis/QuerySelectorPanel';
import { getGuidedQueryRecipe } from '@/config/guidedQueryRecipes';
import { GuidedAnalysisLayout } from '@/features/guided-analysis/components/GuidedAnalysisLayout';
import { GuidedDialogs } from '@/features/guided-analysis/components/GuidedDialogs';
import { GuidedFiltersPanel } from '@/features/guided-analysis/components/GuidedFiltersPanel';
import { GuidedQueryHeader } from '@/features/guided-analysis/components/GuidedQueryHeader';
import { GuidedResultsSection } from '@/features/guided-analysis/components/GuidedResultsSection';
import { useGuidedCatalog } from '@/features/guided-analysis/hooks/useGuidedCatalog';
import { useGuidedExecution } from '@/features/guided-analysis/hooks/useGuidedExecution';
import { useGuidedFilterState } from '@/features/guided-analysis/hooks/useGuidedFilterState';
import { useGuidedQueryOptions } from '@/features/guided-analysis/hooks/useGuidedQueryOptions';
import { useGuidedQuerySelection } from '@/features/guided-analysis/hooks/useGuidedQuerySelection';
import { sanitizeFilterStateForOptions } from '@/features/guided-analysis/utils';
import { EmptyState, ErrorState, LoadingState } from '@/shared/feedback';

interface GuidedAnalysisPageProps {
  onCompoundSelect: (cpd: string) => void;
}

export function GuidedAnalysisPage({ onCompoundSelect }: GuidedAnalysisPageProps) {
  const { catalog, catalogLoading, catalogError, reload } = useGuidedCatalog();
  const { selectedQueryId, setSelectedQueryId, selectedQuery } = useGuidedQuerySelection(catalog);

  const {
    filters,
    isReady: filterStateReady,
    replaceFilters,
    handleFilterChange,
    handleResetFilters,
  } = useGuidedFilterState({ query: selectedQuery });

  const shouldLoadOptions = Boolean(selectedQuery) && filterStateReady;
  const {
    optionsByFilter,
    optionsError,
    optionsReadyForQueryId,
  } = useGuidedQueryOptions(selectedQuery, filters, shouldLoadOptions);

  const effectiveFilters = useMemo(() => {
    if (!selectedQuery || optionsReadyForQueryId !== selectedQuery.id) {
      return filters;
    }

    return sanitizeFilterStateForOptions(selectedQuery, filters, optionsByFilter);
  }, [filters, optionsByFilter, optionsReadyForQueryId, selectedQuery]);

  useEffect(() => {
    if (effectiveFilters !== filters) {
      replaceFilters(effectiveFilters);
    }
  }, [effectiveFilters, filters, replaceFilters]);

  const canExecute = Boolean(selectedQuery) &&
    filterStateReady &&
    optionsReadyForQueryId === selectedQuery?.id;

  const {
    execution,
    executionLoading,
    executionError,
    setPage,
  } = useGuidedExecution(selectedQuery, effectiveFilters, canExecute);

  const selectedRecipe = useMemo(
    () => (selectedQuery ? getGuidedQueryRecipe(selectedQuery.id) : undefined),
    [selectedQuery]
  );

  if (catalogLoading) {
    return (
      <LoadingState
        title="Loading guided analysis catalog..."
        message="Preparing guided queries and filter defaults."
      />
    );
  }

  if (catalogError) {
    return (
      <ErrorState
        title="Unable to load guided analysis catalog"
        message={catalogError}
        actionLabel="Retry"
        onAction={reload}
      />
    );
  }

  if (!catalog || !selectedQuery) {
    return (
      <EmptyState
        title="No guided queries available"
        message="The guided analysis catalog did not return any use cases."
      />
    );
  }

  return (
    <GuidedAnalysisLayout
      title={catalog.title}
      description="Declarative guided use cases executed server-side with SQLite."
      sidebar={
        <QuerySelectorPanel
          categories={catalog.categories}
          queries={catalog.queries}
          selectedId={selectedQueryId}
          onSelect={setSelectedQueryId}
        />
      }
    >
      <GuidedQueryHeader query={selectedQuery} execution={execution} />
      <GuidedDialogs query={selectedQuery} recipe={selectedRecipe} />
      <GuidedFiltersPanel
        query={selectedQuery}
        values={effectiveFilters}
        optionsByFilter={optionsByFilter}
        optionsError={optionsError}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />
      <GuidedResultsSection
        execution={execution}
        executionLoading={executionLoading}
        executionError={executionError}
        onCompoundSelect={onCompoundSelect}
        onPageChange={setPage}
      />
    </GuidedAnalysisLayout>
  );
}
