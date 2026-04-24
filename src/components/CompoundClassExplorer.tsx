import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getCompoundClasses } from '@/features/compound-classes/api';
import type { CompoundClassFilters, CompoundClassSummary } from '@/features/compound-classes/types';
import { useAsyncResource } from '@/shared/hooks/useAsyncResource';
import { useFilterState } from '@/shared/hooks/useFilterState';
import { usePaginatedList } from '@/shared/hooks/usePaginatedList';
import {
  Badge,
  Button,
  DataTable,
  ExplorerLayout,
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

interface CompoundClassExplorerProps {
  onCompoundClassSelect?: (compoundclass: string) => void;
}

export function CompoundClassExplorer({ onCompoundClassSelect }: CompoundClassExplorerProps) {
  const [searchInput, setSearchInput] = useState('');
  const { activeFilterCount, filters, resetFilters, setFilterValue } = useFilterState<CompoundClassFilters>({});
  const { page, pageSize, resetPagination, setPage, syncPagination, total, totalPages } = usePaginatedList(50);

  const loadClasses = useCallback(async () => {
    const response = await getCompoundClasses(filters, { page, pageSize });
    syncPagination(response);
    return response.data;
  }, [filters, page, pageSize, syncPagination]);

  const { data: classesData, error, loading, reload } = useAsyncResource<CompoundClassSummary[]>(loadClasses, {
    initialData: [],
  });
  const classes = classesData ?? [];

  function updateFilter<K extends keyof CompoundClassFilters>(key: K, value: CompoundClassFilters[K] | undefined) {
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

  const hasRowNavigation = Boolean(onCompoundClassSelect);
  const summaryText = useMemo(() => {
    return (
      <>
        Showing <strong>{classes.length}</strong> of <strong>{total}</strong> classes
      </>
    );
  }, [classes.length, total]);

  return (
    <ExplorerLayout
      eyebrow="Exploration"
      title="Compound Classes"
      description="Browse compound-class level aggregates before opening the class-specific detail overview."
      toolbar={
        <FilterToolbar>
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            placeholder="Search by compound class..."
          />
        </FilterToolbar>
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
        isEmpty={classes.length === 0}
        emptyMessage="No compound classes matched the current search."
        loadingMessage="Please wait while compound classes are loaded."
        onRetry={() => {
          void reload();
        }}
        summary={<ResultSummaryBar summary={summaryText} />}
        footer={<PaginationFooter currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      >
        <Table>
          <TableHeader className="bg-slate-50/90">
            <TableRow>
              <TableHead className="pl-6">Compound Class</TableHead>
              <TableHead>Compound Count</TableHead>
              <TableHead>KO Count</TableHead>
              <TableHead>Gene Count</TableHead>
              <TableHead className="pr-6">Pathway Annotations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((compoundClass) => (
              <TableRow
                key={compoundClass.compoundclass}
                className={hasRowNavigation ? 'cursor-pointer' : undefined}
                onClick={() => onCompoundClassSelect?.(compoundClass.compoundclass)}
                onKeyDown={(event) => {
                  if (!onCompoundClassSelect) {
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCompoundClassSelect(compoundClass.compoundclass);
                  }
                }}
                tabIndex={hasRowNavigation ? 0 : undefined}
              >
                {hasRowNavigation ? (
                  <RowLinkCell
                    className="pl-6"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCompoundClassSelect?.(compoundClass.compoundclass);
                    }}
                  >
                    {compoundClass.compoundclass}
                  </RowLinkCell>
                ) : (
                  <TableCell className="pl-6 font-medium">{compoundClass.compoundclass}</TableCell>
                )}
                <TableCell>{compoundClass.compound_count}</TableCell>
                <TableCell>{compoundClass.ko_count}</TableCell>
                <TableCell>{compoundClass.gene_count}</TableCell>
                <TableCell className="pr-6">{compoundClass.pathway_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>
    </ExplorerLayout>
  );
}
