import { useState, useEffect } from 'react';
import { Search, Download, X } from 'lucide-react';
import {
  getCompounds,
  getUniqueCompoundClasses,
  getUniqueReferenceAGs,
  getUniqueGenes,
  getPathwayOptions,
  exportCompoundsToCSV,
  exportCompoundsToJSON,
} from '../services/api';
import type { CompoundSummary, CompoundFilters, PathwayOption } from '../types/database';
import { Pagination } from './Pagination';

interface CompoundExplorerProps {
  onCompoundSelect: (cpd: string) => void;
}

export function CompoundExplorer({ onCompoundSelect }: CompoundExplorerProps) {
  const [compounds, setCompounds] = useState<CompoundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);

  const [compoundClasses, setCompoundClasses] = useState<string[]>([]);
  const [referenceAGs, setReferenceAGs] = useState<string[]>([]);
  const [genes, setGenes] = useState<string[]>([]);
  const [pathwayOptions, setPathwayOptions] = useState<PathwayOption[]>([]);
  const [filters, setFilters] = useState<CompoundFilters>({});
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadCompounds();
  }, [currentPage, filters]);

  async function loadMetadata() {
    try {
      const [classes, refs, availableGenes, availablePathways] = await Promise.all([
        getUniqueCompoundClasses(),
        getUniqueReferenceAGs(),
        getUniqueGenes(),
        getPathwayOptions(),
      ]);
      setCompoundClasses(classes);
      setReferenceAGs(refs);
      setGenes(availableGenes);
      setPathwayOptions(availablePathways);
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  }

  async function loadCompounds() {
    setLoading(true);
    try {
      const response = await getCompounds(filters, { page: currentPage, pageSize });
      setCompounds(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading compounds:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof CompoundFilters, value: string | number | undefined) {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value === '' || value === undefined) {
        delete newFilters[key];
      } else {
        newFilters[key] = value as never;
      }
      return newFilters;
    });
    setCurrentPage(1);
  }

  const availablePathwaySources = [...new Set(pathwayOptions.map((item) => item.source))]
    .sort((a, b) => a.localeCompare(b));
  const pathwaysBySource = availablePathwaySources.map((source) => ({
    source,
    pathways: [
      ...new Set(pathwayOptions.filter((item) => item.source === source).map((item) => item.pathway)),
    ].sort((a, b) => a.localeCompare(b)),
  }));
  const visiblePathways = filters.pathway_source
    ? pathwaysBySource.find((entry) => entry.source === filters.pathway_source)?.pathways ?? []
    : [];

  function handleSearch() {
    handleFilterChange('search', searchInput || undefined);
  }

  function clearFilters() {
    setFilters({});
    setSearchInput('');
    setCurrentPage(1);
  }

  async function handleExport(format: 'csv' | 'json') {
    try {
      const data = format === 'csv'
        ? await exportCompoundsToCSV(filters)
        : await exportCompoundsToJSON(filters);

      const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compounds.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  }

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Compound Explorer</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by compound name or ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compound Class
            </label>
            <select
              value={filters.compoundclass || ''}
              onChange={(e) => handleFilterChange('compoundclass', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Classes</option>
              {compoundClasses.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pathway Source
            </label>
            <select
              value={filters.pathway_source || ''}
              onChange={(e) => {
                const source = e.target.value || undefined;
                handleFilterChange('pathway_source', source);
                if (
                  filters.pathway &&
                  source &&
                  !pathwayOptions.some((item) => item.source === source && item.pathway === filters.pathway)
                ) {
                  handleFilterChange('pathway', undefined);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Sources</option>
              {availablePathwaySources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pathway
            </label>
            <select
              value={filters.pathway || ''}
              onChange={(e) => handleFilterChange('pathway', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Pathways</option>
              {filters.pathway_source ? (
                visiblePathways.map((pathway) => (
                  <option key={pathway} value={pathway}>{pathway}</option>
                ))
              ) : (
                pathwaysBySource.map((group) => (
                  <optgroup key={group.source} label={group.source}>
                    {group.pathways.map((pathway) => (
                      <option key={`${group.source}-${pathway}`} value={pathway}>
                        {pathway}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
            {!filters.pathway_source && (
              <p className="mt-1 text-xs text-gray-500">Tip: select Pathway Source first to simplify this list.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gene
            </label>
            <select
              value={filters.gene || ''}
              onChange={(e) => handleFilterChange('gene', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Genes</option>
              {genes.map((gene) => (
                <option key={gene} value={gene}>{gene}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference AG
            </label>
            <select
              value={filters.reference_ag || ''}
              onChange={(e) => handleFilterChange('reference_ag', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All References</option>
              {referenceAGs.map((ref) => (
                <option key={ref} value={ref}>{ref}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min KO Count
            </label>
            <input
              type="number"
              value={filters.ko_count_min || ''}
              onChange={(e) => handleFilterChange('ko_count_min', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Min"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max KO Count
            </label>
            <input
              type="number"
              value={filters.ko_count_max || ''}
              onChange={(e) => handleFilterChange('ko_count_max', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Max"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Gene Count
            </label>
            <input
              type="number"
              value={filters.gene_count_min || ''}
              onChange={(e) => handleFilterChange('gene_count_min', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Min"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Gene Count
            </label>
            <input
              type="number"
              value={filters.gene_count_max || ''}
              onChange={(e) => handleFilterChange('gene_count_max', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Max"
            />
          </div>

        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {compounds.length} of {total} compounds
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading compounds...
          </div>
        ) : compounds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No compounds found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compound ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KO Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gene Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pathway Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toxicity Risk Mean
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {compounds.map((compound) => (
                  <tr
                    key={compound.cpd}
                    onClick={() => onCompoundSelect(compound.cpd)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {compound.cpd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {compound.compoundname || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {compound.compoundclass || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {compound.ko_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {compound.gene_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {compound.pathway_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {compound.toxicity_risk_mean == null ? '-' : compound.toxicity_risk_mean.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {compound.reference_ag || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
