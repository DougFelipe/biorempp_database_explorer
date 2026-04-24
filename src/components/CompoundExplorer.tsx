import { useCallback, useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';
import {
  exportCompoundsToCSV,
  exportCompoundsToJSON,
  getCompounds,
} from '@/features/compounds/api';
import type { CompoundFilters, CompoundSummary } from '@/features/compounds/types';
import { getPathwayOptions, getUniqueCompoundClasses, getUniqueGenes, getUniqueReferenceAGs } from '@/features/meta/api';
import type { PathwayOption } from '@/features/meta/types';
import { InlineStatusBanner } from '@/shared/feedback';
import { useAsyncResource } from '@/shared/hooks/useAsyncResource';
import { useFileExport } from '@/shared/hooks/useFileExport';
import { useFilterState } from '@/shared/hooks/useFilterState';
import { usePaginatedList } from '@/shared/hooks/usePaginatedList';
import {
  Badge,
  Button,
  DataTable,
  ExplorerLayout,
  ExportActions,
  FilterField,
  FilterGrid,
  FilterToolbar,
  PaginationFooter,
  ResultSummaryBar,
  RowLinkCell,
  SearchField,
  Select,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';

interface CompoundExplorerProps {
  onCompoundSelect: (cpd: string) => void;
}

interface CompoundExplorerMetadata {
  compoundClasses: string[];
  pathwayOptions: PathwayOption[];
  genes: string[];
  referenceAGs: string[];
}

const EMPTY_METADATA: CompoundExplorerMetadata = {
  compoundClasses: [],
  pathwayOptions: [],
  genes: [],
  referenceAGs: [],
};

export function CompoundExplorer({ onCompoundSelect }: CompoundExplorerProps) {
  const [searchInput, setSearchInput] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const {
    activeFilterCount,
    filters,
    resetFilters,
    setFilterValue,
  } = useFilterState<CompoundFilters>({});
  const {
    page,
    pageSize,
    resetPagination,
    setPage,
    syncPagination,
    total,
    totalPages,
  } = usePaginatedList(50);
  const { exporting, runExport } = useFileExport();

  const loadMetadata = useCallback(async () => {
    const [compoundClasses, referenceAGs, genes, pathwayOptions] = await Promise.all([
      getUniqueCompoundClasses(),
      getUniqueReferenceAGs(),
      getUniqueGenes(),
      getPathwayOptions(),
    ]);

    return {
      compoundClasses,
      genes,
      pathwayOptions,
      referenceAGs,
    };
  }, []);

  const { data: metadataData, error: metadataError } = useAsyncResource(loadMetadata, {
    initialData: EMPTY_METADATA,
  });
  const metadata = metadataData ?? EMPTY_METADATA;

  const loadCompounds = useCallback(async () => {
    const response = await getCompounds(filters, { page, pageSize });
    syncPagination(response);
    return response.data;
  }, [filters, page, pageSize, syncPagination]);

  const { data: compoundsData, error, loading, reload } = useAsyncResource<CompoundSummary[]>(loadCompounds, {
    initialData: [],
  });
  const compounds = compoundsData ?? [];

  const availablePathwaySources = useMemo(() => {
    return [...new Set(metadata.pathwayOptions.map((item) => item.source))].sort((left, right) =>
      left.localeCompare(right)
    );
  }, [metadata.pathwayOptions]);

  const pathwaysBySource = useMemo(() => {
    return availablePathwaySources.map((source) => ({
      pathways: [
        ...new Set(metadata.pathwayOptions.filter((item) => item.source === source).map((item) => item.pathway)),
      ].sort((left, right) => left.localeCompare(right)),
      source,
    }));
  }, [availablePathwaySources, metadata.pathwayOptions]);

  const visiblePathways = useMemo(() => {
    if (!filters.pathway_source) {
      return [];
    }

    return pathwaysBySource.find((entry) => entry.source === filters.pathway_source)?.pathways ?? [];
  }, [filters.pathway_source, pathwaysBySource]);

  function updateFilter<K extends keyof CompoundFilters>(key: K, value: CompoundFilters[K] | undefined) {
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

  function handlePathwaySourceChange(nextSource: string | undefined) {
    updateFilter('pathway_source', nextSource);

    if (
      filters.pathway &&
      nextSource &&
      !metadata.pathwayOptions.some((item) => item.source === nextSource && item.pathway === filters.pathway)
    ) {
      updateFilter('pathway', undefined);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    setExportError(null);

    try {
      await runExport({
        filename: `compounds.${format}`,
        loader: () => (format === 'csv' ? exportCompoundsToCSV(filters) : exportCompoundsToJSON(filters)),
        mimeType: format === 'csv' ? 'text/csv' : 'application/json',
      });
    } catch (nextError) {
      setExportError(nextError instanceof Error ? nextError.message : 'Unknown export error.');
    }
  }

  return (
    <ExplorerLayout
      eyebrow="Exploration"
      title="Compound Explorer"
      description="Browse compound-level summaries, metadata-backed filters, export actions and direct links to detail views."
      toolbar={
        <FilterToolbar
          actions={
            <ExportActions
              items={[
                {
                  disabled: exporting,
                  icon: Download,
                  id: 'compound-export-csv',
                  label: exporting ? 'Exporting...' : 'Export CSV',
                  onClick: () => handleExport('csv'),
                  variant: 'success',
                },
                {
                  disabled: exporting,
                  icon: Download,
                  id: 'compound-export-json',
                  label: exporting ? 'Exporting...' : 'Export JSON',
                  onClick: () => handleExport('json'),
                },
              ]}
            />
          }
        >
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            placeholder="Search by compound name or ID..."
          />
        </FilterToolbar>
      }
      filters={
        <FilterGrid>
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

          <FilterField label="Pathway Source">
            <Select
              value={filters.pathway_source || ''}
              onChange={(event) => handlePathwaySourceChange(event.target.value || undefined)}
            >
              <option value="">All Sources</option>
              {availablePathwaySources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField
            label="Pathway"
            hint={!filters.pathway_source ? 'Tip: select Pathway Source first to simplify this list.' : undefined}
          >
            <Select
              value={filters.pathway || ''}
              onChange={(event) => updateFilter('pathway', event.target.value || undefined)}
            >
              <option value="">All Pathways</option>
              {filters.pathway_source
                ? visiblePathways.map((pathway) => (
                    <option key={pathway} value={pathway}>
                      {pathway}
                    </option>
                  ))
                : pathwaysBySource.map((group) => (
                    <optgroup key={group.source} label={group.source}>
                      {group.pathways.map((pathway) => (
                        <option key={`${group.source}-${pathway}`} value={pathway}>
                          {pathway}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </Select>
          </FilterField>

          <FilterField label="Gene">
            <Select value={filters.gene || ''} onChange={(event) => updateFilter('gene', event.target.value || undefined)}>
              <option value="">All Genes</option>
              {metadata.genes.map((gene) => (
                <option key={gene} value={gene}>
                  {gene}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Reference AG">
            <Select
              value={filters.reference_ag || ''}
              onChange={(event) => updateFilter('reference_ag', event.target.value || undefined)}
            >
              <option value="">All References</option>
              {metadata.referenceAGs.map((reference) => (
                <option key={reference} value={reference}>
                  {reference}
                </option>
              ))}
            </Select>
          </FilterField>

          <FilterField label="Min KO Count">
            <Input
              type="number"
              value={filters.ko_count_min || ''}
              onChange={(event) =>
                updateFilter('ko_count_min', event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="Min"
            />
          </FilterField>

          <FilterField label="Max KO Count">
            <Input
              type="number"
              value={filters.ko_count_max || ''}
              onChange={(event) =>
                updateFilter('ko_count_max', event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="Max"
            />
          </FilterField>

          <FilterField label="Min Gene Count">
            <Input
              type="number"
              value={filters.gene_count_min || ''}
              onChange={(event) =>
                updateFilter('gene_count_min', event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="Min"
            />
          </FilterField>

          <FilterField label="Max Gene Count">
            <Input
              type="number"
              value={filters.gene_count_max || ''}
              onChange={(event) =>
                updateFilter('gene_count_max', event.target.value ? Number(event.target.value) : undefined)
              }
              placeholder="Max"
            />
          </FilterField>
        </FilterGrid>
      }
      footer={
        <div className="space-y-3">
          {metadataError ? (
            <InlineStatusBanner tone="warning">
              Metadata filters could not be fully loaded. The explorer still uses the current server response.
            </InlineStatusBanner>
          ) : null}

          {exportError ? <InlineStatusBanner tone="error">{exportError}</InlineStatusBanner> : null}

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
        onRetry={() => {
          void reload();
        }}
        isEmpty={compounds.length === 0}
        emptyMessage="No compounds matched the current filters."
        summary={
          <ResultSummaryBar
            summary={
              <>
                Showing <strong>{compounds.length}</strong> of <strong>{total}</strong> compounds
              </>
            }
          />
        }
        footer={<PaginationFooter currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
      >
        <Table>
          <TableHeader className="bg-slate-50/90">
            <TableRow>
              <TableHead className="pl-6">Compound ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>KO Count</TableHead>
              <TableHead>Gene Count</TableHead>
              <TableHead title="Includes HADEG, KEGG and Compound Pathway annotations">
                Pathway Annotations
              </TableHead>
              <TableHead>Toxicity Risk Mean</TableHead>
              <TableHead>High Risk Endpoints</TableHead>
              <TableHead className="pr-6">References</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {compounds.map((compound) => (
              <TableRow
                key={compound.cpd}
                onClick={() => onCompoundSelect(compound.cpd)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCompoundSelect(compound.cpd);
                  }
                }}
                tabIndex={0}
                className="cursor-pointer"
              >
                <RowLinkCell
                  className="pl-6"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCompoundSelect(compound.cpd);
                  }}
                >
                  {compound.cpd}
                </RowLinkCell>
                <TableCell>{compound.compoundname || '-'}</TableCell>
                <TableCell>{compound.compoundclass || '-'}</TableCell>
                <TableCell>{compound.ko_count}</TableCell>
                <TableCell>{compound.gene_count}</TableCell>
                <TableCell>{compound.pathway_count}</TableCell>
                <TableCell>
                  {compound.toxicity_risk_mean == null ? '-' : compound.toxicity_risk_mean.toFixed(2)}
                </TableCell>
                <TableCell>{compound.high_risk_endpoint_count}</TableCell>
                <TableCell className="pr-6" title={compound.reference_ag || 'No reference annotation'}>
                  {compound.reference_count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTable>
    </ExplorerLayout>
  );
}
