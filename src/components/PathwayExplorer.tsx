import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getPathways } from '@/features/pathways/api';
import type { PathwayFilters, PathwaySummary } from '@/features/pathways/types';
import { useAsyncResource } from '@/shared/hooks/useAsyncResource';
import { useFilterState } from '@/shared/hooks/useFilterState';
import { usePaginatedList } from '@/shared/hooks/usePaginatedList';
import {
  Badge,
  Button,
  DataTable,
  ExplorerLayout,
  FilterField,
  FilterToolbar,
  PaginationFooter,
  ResultSummaryBar,
  RowLinkCell,
  SearchField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';

interface PathwayExplorerProps {
  onPathwaySelect?: (pathway: string, source?: string) => void;
}

const SOURCE_OPTIONS = ['KEGG', 'HADEG'] as const;
const DEFAULT_SOURCE: (typeof SOURCE_OPTIONS)[number] = 'KEGG';

function sourceBadgeVariant(source: string) {
  return source === 'HADEG' ? 'subtle' : 'success';
}

export function PathwayExplorer({ onPathwaySelect }: PathwayExplorerProps) {
  const [searchInput, setSearchInput] = useState('');
  const { filters, replaceFilters, setFilterValue } = useFilterState<PathwayFilters>({
    source: DEFAULT_SOURCE,
  });
  const { page, pageSize, resetPagination, setPage, syncPagination, total, totalPages } = usePaginatedList(50);

  const loadPathways = useCallback(async () => {
    const response = await getPathways(filters, { page, pageSize });
    syncPagination(response);
    return response.data;
  }, [filters, page, pageSize, syncPagination]);

  const { data: pathwaysData, error, loading, reload } = useAsyncResource<PathwaySummary[]>(loadPathways, {
    initialData: [],
  });
  const pathways = pathwaysData ?? [];

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (value === undefined || value === '') {
        return false;
      }

      if (key === 'source') {
        return value !== DEFAULT_SOURCE;
      }

      return true;
    }).length;
  }, [filters]);

  function updateFilter<K extends keyof PathwayFilters>(key: K, value: PathwayFilters[K] | undefined) {
    setFilterValue(key, value);
    resetPagination();
  }

  function handleSearch() {
    updateFilter('search', searchInput || undefined);
  }

  function clearFilters() {
    replaceFilters({ source: DEFAULT_SOURCE });
    setSearchInput('');
    resetPagination();
  }

  const hasRowNavigation = Boolean(onPathwaySelect);
  const summaryText = useMemo(() => {
    return (
      <>
        Showing <strong>{pathways.length}</strong> of <strong>{total}</strong> pathways
      </>
    );
  }, [pathways.length, total]);

  return (
    <ExplorerLayout
      eyebrow="Exploration"
      title="Pathway Explorer"
      description="Inspect pathway rankings by source while keeping one database in focus at a time."
      toolbar={
        <FilterToolbar>
          <SearchField value={searchInput} onChange={setSearchInput} onSearch={handleSearch} placeholder="Search pathways..." />
        </FilterToolbar>
      }
      filters={
        <div className="space-y-3">
          <FilterField label="Source">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {SOURCE_OPTIONS.map((source) => {
                const selected = filters.source === source;

                return (
                  <Button
                    key={source}
                    variant={selected ? 'subtle' : 'ghost'}
                    size="sm"
                    onClick={() => updateFilter('source', source)}
                    className="rounded-xl"
                  >
                    {source}
                  </Button>
                );
              })}
            </div>
          </FilterField>

          <p className="text-xs text-slate-500">
            Showing one database at a time to keep pathway rankings easier to inspect.
          </p>
        </div>
      }
      footer={
        activeFilterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              {activeFilterCount} active filter{activeFilterCount === 1 ? '' : 's'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          </div>
        ) : undefined
      }
    >
      <DataTable
        loading={loading}
        error={error}
        isEmpty={pathways.length === 0}
        emptyMessage="No pathways matched the current filters."
        loadingMessage="Please wait while pathway rankings are loaded."
        onRetry={() => {
          void reload();
        }}
        summary={<ResultSummaryBar summary={summaryText} />}
        footer={<PaginationFooter currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      >
        <Table>
          <TableHeader className="bg-slate-50/90">
            <TableRow>
              <TableHead className="pl-6">Pathway</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Compound Count</TableHead>
              <TableHead className="pr-6">Gene Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pathways.map((pathway, index) => (
              <TableRow
                key={`${pathway.pathway}-${pathway.source}-${index}`}
                className={hasRowNavigation ? 'cursor-pointer' : undefined}
                onClick={() => onPathwaySelect?.(pathway.pathway, pathway.source)}
                onKeyDown={(event) => {
                  if (!onPathwaySelect) {
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPathwaySelect(pathway.pathway, pathway.source);
                  }
                }}
                tabIndex={hasRowNavigation ? 0 : undefined}
              >
                {hasRowNavigation ? (
                  <RowLinkCell
                    className="pl-6"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPathwaySelect?.(pathway.pathway, pathway.source);
                    }}
                  >
                    {pathway.pathway}
                  </RowLinkCell>
                ) : (
                  <TableCell className="pl-6 font-medium">{pathway.pathway}</TableCell>
                )}
                <TableCell>
                  <Badge variant={sourceBadgeVariant(pathway.source)}>{pathway.source}</Badge>
                </TableCell>
                <TableCell>{pathway.compound_count}</TableCell>
                <TableCell className="pr-6">{pathway.gene_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>
    </ExplorerLayout>
  );
}
