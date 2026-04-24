import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getGenes } from '@/features/genes/api';
import type { GeneFilters, GeneSummary } from '@/features/genes/types';
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
  RowLinkCell,
  SearchField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';

interface GeneExplorerProps {
  onGeneSelect?: (ko: string) => void;
}

function renderEnzymeActivities(activities: string[]) {
  if (activities.length === 0) {
    return '-';
  }

  if (activities.length <= 2) {
    return activities.join(', ');
  }

  return `${activities.slice(0, 2).join(', ')} +${activities.length - 2} more`;
}

export function GeneExplorer({ onGeneSelect }: GeneExplorerProps) {
  const [searchInput, setSearchInput] = useState('');
  const { activeFilterCount, filters, resetFilters, setFilterValue } = useFilterState<GeneFilters>({});
  const { page, pageSize, resetPagination, setPage, syncPagination, total, totalPages } = usePaginatedList(50);

  const loadGenes = useCallback(async () => {
    const response = await getGenes(filters, { page, pageSize });
    syncPagination(response);
    return response.data;
  }, [filters, page, pageSize, syncPagination]);

  const { data: genesData, error, loading, reload } = useAsyncResource<GeneSummary[]>(loadGenes, {
    initialData: [],
  });
  const genes = genesData ?? [];

  function updateFilter<K extends keyof GeneFilters>(key: K, value: GeneFilters[K] | undefined) {
    setFilterValue(key, value);
    resetPagination();
  }

  function handleSearch() {
    updateFilter('search', searchInput || undefined);
  }

  function clearFilters() {
    resetFilters();
    setSearchInput('');
    resetPagination();
  }

  const hasRowNavigation = Boolean(onGeneSelect);
  const summaryText = useMemo(() => {
    return (
      <>
        Showing <strong>{genes.length}</strong> of <strong>{total}</strong> genes
      </>
    );
  }, [genes.length, total]);

  return (
    <ExplorerLayout
      eyebrow="Exploration"
      title="Gene / KO Explorer"
      description="Browse KO and gene-level records with compound coverage, pathway counts and enzyme annotations."
      toolbar={
        <FilterToolbar>
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            placeholder="Search by gene symbol, name, or KO..."
          />
        </FilterToolbar>
      }
      filters={
        <FilterGrid className="md:grid-cols-2 xl:grid-cols-2">
          <FilterField label="Min Compound Count">
            <Input
              type="number"
              value={filters.compound_count_min || ''}
              onChange={(event) =>
                updateFilter('compound_count_min', event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="Min"
            />
          </FilterField>

          <FilterField label="Max Compound Count">
            <Input
              type="number"
              value={filters.compound_count_max || ''}
              onChange={(event) =>
                updateFilter('compound_count_max', event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="Max"
            />
          </FilterField>
        </FilterGrid>
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
        isEmpty={genes.length === 0}
        emptyMessage="No genes matched the current filters."
        loadingMessage="Please wait while gene records are loaded."
        onRetry={() => {
          void reload();
        }}
        summary={<ResultSummaryBar summary={summaryText} />}
        footer={<PaginationFooter currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      >
        <Table>
          <TableHeader className="bg-slate-50/90">
            <TableRow>
              <TableHead className="pl-6">KO</TableHead>
              <TableHead>Gene Symbol</TableHead>
              <TableHead>Gene Name</TableHead>
              <TableHead>Compound Count</TableHead>
              <TableHead>Pathway Count</TableHead>
              <TableHead className="pr-6">Enzyme Activities</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {genes.map((gene) => (
              <TableRow
                key={gene.ko}
                className={hasRowNavigation ? 'cursor-pointer' : undefined}
                onClick={() => onGeneSelect?.(gene.ko)}
                onKeyDown={(event) => {
                  if (!onGeneSelect) {
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onGeneSelect(gene.ko);
                  }
                }}
                tabIndex={hasRowNavigation ? 0 : undefined}
              >
                {hasRowNavigation ? (
                  <RowLinkCell
                    className="pl-6"
                    onClick={(event) => {
                      event.stopPropagation();
                      onGeneSelect?.(gene.ko);
                    }}
                  >
                    {gene.ko}
                  </RowLinkCell>
                ) : (
                  <TableCell className="pl-6 font-mono font-medium text-accent">{gene.ko}</TableCell>
                )}
                <TableCell>{gene.genesymbol || '-'}</TableCell>
                <TableCell>{gene.genename || '-'}</TableCell>
                <TableCell>{gene.compound_count}</TableCell>
                <TableCell>{gene.pathway_count}</TableCell>
                <TableCell className="pr-6">{renderEnzymeActivities(gene.enzyme_activities)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>
    </ExplorerLayout>
  );
}
