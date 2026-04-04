import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getGenes } from '../services/api';
import type { GeneSummary, GeneFilters } from '../types/database';
import { Pagination } from './Pagination';

export function GeneExplorer() {
  const [genes, setGenes] = useState<GeneSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);

  const [filters, setFilters] = useState<GeneFilters>({});
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadGenes();
  }, [currentPage, filters]);

  async function loadGenes() {
    setLoading(true);
    try {
      const response = await getGenes(filters, { page: currentPage, pageSize });
      setGenes(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading genes:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof GeneFilters, value: string | number | undefined) {
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

  function handleSearch() {
    handleFilterChange('search', searchInput || undefined);
  }

  function clearFilters() {
    setFilters({});
    setSearchInput('');
    setCurrentPage(1);
  }

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Gene / KO Explorer</h2>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by gene symbol, name, or KO..."
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Compound Count
            </label>
            <input
              type="number"
              value={filters.compound_count_min || ''}
              onChange={(e) => handleFilterChange('compound_count_min', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Min"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Compound Count
            </label>
            <input
              type="number"
              value={filters.compound_count_max || ''}
              onChange={(e) => handleFilterChange('compound_count_max', e.target.value ? Number(e.target.value) : undefined)}
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
            Showing {genes.length} of {total} genes
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading genes...
          </div>
        ) : genes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No genes found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gene Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gene Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compound Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pathway Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enzyme Activities
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {genes.map((gene) => (
                  <tr key={gene.ko} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                      {gene.ko}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {gene.genesymbol || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {gene.genename || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {gene.compound_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {gene.pathway_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {gene.enzyme_activities.length > 0 ? (
                        <div className="max-w-md">
                          {gene.enzyme_activities.slice(0, 2).join(', ')}
                          {gene.enzyme_activities.length > 2 && (
                            <span className="text-gray-400"> +{gene.enzyme_activities.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
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
