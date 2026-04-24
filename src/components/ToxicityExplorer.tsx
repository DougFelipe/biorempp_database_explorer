import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getUniqueCompoundClasses } from '@/features/meta/api';
import { getToxicityData, getToxicityEndpoints, getToxicityLabels } from '@/features/toxicity/api';
import type { ToxicityEndpoint, ToxicityFilters } from '@/features/toxicity/types';
import { InlineStatusBanner } from '@/shared/feedback';
import { useAsyncResource } from '@/shared/hooks/useAsyncResource';
import { useFilterState } from '@/shared/hooks/useFilterState';
import { usePaginatedList } from '@/shared/hooks/usePaginatedList';
import {
  Badge,
  Button,
  DataTable,
  ExplorerLayout,
  FilterField,
  FilterGrid,
  FilterToolbar,
  Input,
  PaginationFooter,
  ResultSummaryBar,
  SearchField,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';

interface ToxicityExplorerMetadata {
  compoundClasses: string[];
  endpoints: string[];
}

const EMPTY_METADATA: ToxicityExplorerMetadata = {
  compoundClasses: [],
  endpoints: [],
};

function formatEndpoint(endpoint: string) {
  return endpoint
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ToxicityExplorer() {
  const [searchInput, setSearchInput] = useState('');
  const { activeFilterCount, filters, replaceFilters, setFilterValue } = useFilterState<ToxicityFilters>({});
  const { page, pageSize, resetPagination, setPage, syncPagination, total, totalPages } = usePaginatedList(50);

  const loadMetadata = useCallback(async () => {
    const [endpoints, compoundClasses] = await Promise.all([
      getToxicityEndpoints(),
      getUniqueCompoundClasses(),
    ]);

    return {
      compoundClasses,
      endpoints,
    };
  }, []);

  const { data: metadataData, error: metadataError } = useAsyncResource(loadMetadata, {
    initialData: EMPTY_METADATA,
  });
  const metadata = metadataData ?? EMPTY_METADATA;

  useEffect(() => {
    if (filters.endpoint || metadata.endpoints.length === 0) {
      return;
    }

    setFilterValue('endpoint', metadata.endpoints[0]);
  }, [filters.endpoint, metadata.endpoints, setFilterValue]);

  const loadLabels = useCallback(async () => {
    if (!filters.endpoint) {
      return [];
    }

    return getToxicityLabels(filters.endpoint);
  }, [filters.endpoint]);

  const { data: labelsData, error: labelsError, setData: setLabelsData } = useAsyncResource<string[]>(loadLabels, {
    enabled: Boolean(filters.endpoint),
    initialData: [],
  });
  const labels = labelsData ?? [];

  useEffect(() => {
    if (filters.endpoint) {
      return;
    }

    setLabelsData([]);
  }, [filters.endpoint, setLabelsData]);

  useEffect(() => {
    if (filters.label && !labels.includes(filters.label)) {
      setFilterValue('label', undefined);
    }
  }, [filters.label, labels, setFilterValue]);

  const loadRecords = useCallback(async () => {
    const response = await getToxicityData(filters, { page, pageSize });
    syncPagination(response);
    return response.data;
  }, [filters, page, pageSize, syncPagination]);

  const { data: recordsData, error, loading, reload } = useAsyncResource<ToxicityEndpoint[]>(loadRecords, {
    initialData: [],
  });
  const records = recordsData ?? [];

  function updateFilter<K extends keyof ToxicityFilters>(key: K, value: ToxicityFilters[K] | undefined) {
    setFilterValue(key, value);
    resetPagination();
  }

  function handleSearch() {
    updateFilter('search', searchInput || undefined);
  }

  function clearFilters() {
    const endpoint = filters.endpoint;
    replaceFilters(endpoint ? { endpoint } : {});
    setSearchInput('');
    resetPagination();
  }

  const summaryText = useMemo(() => {
    return (
      <>
        Showing <strong>{records.length}</strong> of <strong>{total}</strong> endpoint records
      </>
    );
  }, [records.length, total]);

  return (
    <ExplorerLayout
      eyebrow="Exploration"
      title="Toxicity Explorer"
      description="Inspect ToxCSM endpoint predictions with dependent endpoint and label filters."
      toolbar={
        <FilterToolbar>
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            placeholder="Search by compound name or ID..."
          />
        </FilterToolbar>
      }
      filters={
        <FilterGrid className="xl:grid-cols-5">
          <FilterField label="Endpoint">
            <Select
              value={filters.endpoint || ''}
              onChange={(event) => updateFilter('endpoint', event.target.value || undefined)}
            >
              <option value="">All Endpoints</option>
              {metadata.endpoints.map((endpoint) => (
                <option key={endpoint} value={endpoint}>
                  {formatEndpoint(endpoint)}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Label">
            <Select
              value={filters.label || ''}
              onChange={(event) => updateFilter('label', event.target.value || undefined)}
              disabled={!filters.endpoint}
            >
              <option value="">All Labels</option>
              {labels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Compound Class">
            <Select
              value={filters.compoundclass || ''}
              onChange={(event) => updateFilter('compoundclass', event.target.value || undefined)}
            >
              <option value="">All Classes</option>
              {metadata.compoundClasses.map((compoundClass) => (
                <option key={compoundClass} value={compoundClass}>
                  {compoundClass}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Min Value">
            <Input
              type="number"
              step="0.0001"
              value={filters.value_min || ''}
              onChange={(event) => updateFilter('value_min', event.target.value ? Number(event.target.value) : undefined)}
              placeholder="Min"
            />
          </FilterField>

          <FilterField label="Max Value">
            <Input
              type="number"
              step="0.0001"
              value={filters.value_max || ''}
              onChange={(event) => updateFilter('value_max', event.target.value ? Number(event.target.value) : undefined)}
              placeholder="Max"
            />
          </FilterField>
        </FilterGrid>
      }
      footer={
        <div className="space-y-3">
          {metadataError ? (
            <InlineStatusBanner tone="warning">
              Toxicity metadata could not be fully loaded. Endpoint and class filters may be incomplete.
            </InlineStatusBanner>
          ) : null}

          {labelsError ? (
            <InlineStatusBanner tone="warning">
              Endpoint labels could not be refreshed for the selected endpoint.
            </InlineStatusBanner>
          ) : null}

          {activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">
                {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      }
    >
      <DataTable
        loading={loading}
        error={error}
        isEmpty={records.length === 0}
        emptyMessage="No toxicity records matched the current filters."
        loadingMessage="Please wait while toxicity endpoint records are loaded."
        onRetry={() => {
          void reload();
        }}
        summary={<ResultSummaryBar summary={summaryText} />}
        footer={<PaginationFooter currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      >
        <Table>
          <TableHeader className="bg-slate-50/90">
            <TableRow>
              <TableHead className="pl-6">Compound ID</TableHead>
              <TableHead>Compound Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="pr-6">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={`${record.cpd}-${record.endpoint}`}>
                <TableCell className="pl-6 font-medium text-accent">{record.cpd}</TableCell>
                <TableCell>{record.compoundname || '-'}</TableCell>
                <TableCell>{record.compoundclass || '-'}</TableCell>
                <TableCell>{formatEndpoint(record.endpoint)}</TableCell>
                <TableCell>{record.label || '-'}</TableCell>
                <TableCell className="pr-6 font-mono">
                  {record.value !== null ? record.value.toFixed(4) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>
    </ExplorerLayout>
  );
}
