import { useEffect, useMemo, useState } from 'react';
import { executeGuidedQuery, getGuidedCatalog, getGuidedQueryOptions } from '../services/api';
import type {
  GuidedCatalogResponse,
  GuidedExecutionResponse,
  GuidedFilterDefinition,
  GuidedFilterState,
  GuidedFilterValue,
  GuidedQueryDefinition,
} from '../types/guided';
import { GuidedFiltersBar } from './guided-analysis/GuidedFiltersBar';
import { GuidedInsightPanel } from './guided-analysis/GuidedInsightPanel';
import { QuerySelectorPanel } from './guided-analysis/QuerySelectorPanel';
import { GuidedResultTable } from './guided-analysis/GuidedResultTable';
import { GuidedSummaryCards } from './guided-analysis/GuidedSummaryCards';
import { VisualizationRendererRegistry } from './guided-analysis/VisualizationRendererRegistry';

interface GuidedAnalysisPageProps {
  onCompoundSelect: (cpd: string) => void;
}

function toDefaultFilterValue(filter: GuidedFilterDefinition, rawValue: unknown): GuidedFilterValue {
  if (filter.type === 'toggle') {
    return rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1';
  }

  if (filter.type === 'number_range') {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      return {};
    }
    const rawRange = rawValue as { min?: unknown; max?: unknown };
    const min = typeof rawRange.min === 'number' ? rawRange.min : undefined;
    const max = typeof rawRange.max === 'number' ? rawRange.max : undefined;
    return { min, max };
  }

  if (typeof rawValue === 'string') {
    return rawValue;
  }

  return '';
}

function buildDefaultFilterState(query: GuidedQueryDefinition | null): GuidedFilterState {
  if (!query) {
    return {};
  }

  const defaults = (query.defaults?.filters || {}) as Record<string, unknown>;
  const state: GuidedFilterState = {};

  for (const filter of query.filters) {
    state[filter.id] = toDefaultFilterValue(filter, defaults[filter.id]);
  }

  return state;
}

function getQueryPageSize(query: GuidedQueryDefinition | null) {
  if (!query) {
    return 10;
  }
  const fromDefaults = Number(query.defaults?.page_size);
  if (!Number.isFinite(fromDefaults) || fromDefaults <= 0) {
    return 10;
  }
  return Math.min(200, Math.max(1, Math.trunc(fromDefaults)));
}

function serializeFiltersForOptions(filters: GuidedFilterState) {
  const serialized: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value.trim() !== '') {
      serialized[key] = value;
      continue;
    }
    if (typeof value === 'boolean') {
      serialized[key] = value ? 'true' : 'false';
    }
  }
  return serialized;
}

function serializeFiltersForExecute(filters: GuidedFilterState) {
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') {
      if (value.trim() !== '') {
        serialized[key] = value.trim();
      }
      continue;
    }
    if (typeof value === 'boolean') {
      if (value) {
        serialized[key] = value;
      }
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const min = typeof value.min === 'number' ? value.min : undefined;
      const max = typeof value.max === 'number' ? value.max : undefined;
      if (min !== undefined || max !== undefined) {
        serialized[key] = { min, max };
      }
    }
  }
  return serialized;
}

function shouldValidateOptions(filter: GuidedFilterDefinition) {
  return filter.type === 'select' || filter.type === 'dependent_select';
}

export function GuidedAnalysisPage({ onCompoundSelect }: GuidedAnalysisPageProps) {
  const [catalog, setCatalog] = useState<GuidedCatalogResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedQueryId, setSelectedQueryId] = useState<string>('');
  const [filters, setFilters] = useState<GuidedFilterState>({});
  const [optionsByFilter, setOptionsByFilter] = useState<Record<string, Array<{ value: string; label: string }>>>({});
  const [page, setPage] = useState(1);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [execution, setExecution] = useState<GuidedExecutionResponse | null>(null);

  const selectedQuery = useMemo(
    () => catalog?.queries.find((query) => query.id === selectedQueryId) || null,
    [catalog, selectedQueryId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const response = await getGuidedCatalog();
        if (cancelled) {
          return;
        }
        setCatalog(response);
        setSelectedQueryId(response.queries[0]?.id || '');
      } catch (error) {
        if (cancelled) {
          return;
        }
        setCatalogError(error instanceof Error ? error.message : 'Unable to load guided catalog.');
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFilters(buildDefaultFilterState(selectedQuery));
    setPage(1);
  }, [selectedQueryId, selectedQuery]);

  useEffect(() => {
    if (!selectedQuery) {
      return;
    }
    const activeQuery = selectedQuery;

    let cancelled = false;
    async function loadOptions() {
      try {
        const response = await getGuidedQueryOptions(activeQuery.id, serializeFiltersForOptions(filters));
        if (cancelled) {
          return;
        }
        setOptionsByFilter(response.options);
      } catch {
        if (!cancelled) {
          setOptionsByFilter({});
        }
      }
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [selectedQuery, filters]);

  useEffect(() => {
    if (!selectedQuery) {
      return;
    }

    setFilters((current) => {
      let changed = false;
      const next = { ...current };

      for (const filter of selectedQuery.filters) {
        if (!shouldValidateOptions(filter)) {
          continue;
        }
        const options = optionsByFilter[filter.id] || [];
        const currentValue = typeof current[filter.id] === 'string' ? current[filter.id] : '';
        if (!currentValue) {
          continue;
        }
        const exists = options.some((option) => option.value === currentValue);
        if (!exists) {
          if (filter.type === 'dependent_select') {
            next[filter.id] = options[0]?.value || '';
          } else {
            next[filter.id] = '';
          }
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [selectedQuery, optionsByFilter]);

  useEffect(() => {
    if (!selectedQuery) {
      return;
    }
    const activeQuery = selectedQuery;

    let cancelled = false;
    async function runExecution() {
      setExecutionLoading(true);
      setExecutionError(null);
      try {
        const response = await executeGuidedQuery(activeQuery.id, {
          page,
          pageSize: getQueryPageSize(activeQuery),
          filters: serializeFiltersForExecute(filters),
        });
        if (cancelled) {
          return;
        }
        setExecution(response);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setExecutionError(error instanceof Error ? error.message : 'Unable to execute guided query.');
        setExecution(null);
      } finally {
        if (!cancelled) {
          setExecutionLoading(false);
        }
      }
    }
    runExecution();
    return () => {
      cancelled = true;
    };
  }, [selectedQuery, filters, page]);

  useEffect(() => {
    if (!execution?.table) {
      return;
    }
    if (page > execution.table.totalPages) {
      setPage(execution.table.totalPages);
    }
  }, [execution, page]);

  function handleFilterChange(filterId: string, value: GuidedFilterValue) {
    setFilters((current) => ({
      ...current,
      [filterId]: value,
    }));
    setPage(1);
  }

  function handleResetFilters() {
    setFilters(buildDefaultFilterState(selectedQuery));
    setPage(1);
  }

  if (catalogLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        Loading guided analysis catalog...
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 text-red-700">
        Unable to load guided analysis catalog: {catalogError}
      </div>
    );
  }

  if (!catalog || !selectedQuery) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-gray-500">
        No guided queries available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">{catalog.title}</h2>
        <p className="text-sm text-gray-600 mt-1">
          Declarative guided use cases executed server-side with SQLite.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <QuerySelectorPanel
          categories={catalog.categories}
          queries={catalog.queries}
          selectedId={selectedQuery.id}
          onSelect={setSelectedQueryId}
        />

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3">
            <h3 className="text-xl font-semibold text-gray-900">{selectedQuery.title}</h3>
            <p className="text-sm text-gray-700">{selectedQuery.question}</p>
            <p className="text-sm text-gray-600">{selectedQuery.description}</p>
            <p className="text-sm text-gray-500">
              Dataset: {selectedQuery.dataset}
              {execution?.meta?.execution_ms !== undefined ? ` | execution ${execution.meta.execution_ms} ms` : ''}
            </p>
            <GuidedSummaryCards cards={execution?.summary_cards || []} />
            <GuidedInsightPanel insights={execution?.insights || []} />
          </div>

          <GuidedFiltersBar
            filters={selectedQuery.filters}
            values={filters}
            optionsByFilter={optionsByFilter}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {executionLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              Executing query...
            </div>
          ) : executionError ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 text-red-700">
              Unable to execute guided query: {executionError}
            </div>
          ) : execution ? (
            <>
              <VisualizationRendererRegistry
                visualizations={execution.visualizations}
                onCompoundSelect={onCompoundSelect}
              />
              <GuidedResultTable table={execution.table} onCompoundSelect={onCompoundSelect} onPageChange={setPage} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
