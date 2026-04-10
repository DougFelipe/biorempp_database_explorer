import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getPathways } from '../services/api';
import type { PathwaySummary, PathwayFilters } from '../types/database';
import { Pagination } from './Pagination';

interface PathwayExplorerProps {
  onPathwaySelect?: (pathway: string, source?: string) => void;
}

export function PathwayExplorer({ onPathwaySelect }: PathwayExplorerProps) {
  const [pathways, setPathways] = useState<PathwaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);

  const [filters, setFilters] = useState<PathwayFilters>({});
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadPathways();
  }, [currentPage, filters]);

  async function loadPathways() {
    setLoading(true);
    try {
      const response = await getPathways(filters, { page: currentPage, pageSize });
      setPathways(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading pathways:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof PathwayFilters, value: string | undefined) {
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pathway Explorer</h2>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search pathways..."
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Source
          </label>
          <select
            value={filters.source || ''}
            onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Sources</option>
            <option value="HADEG">HADEG</option>
            <option value="KEGG">KEGG</option>
          </select>
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
            Showing {pathways.length} of {total} pathways
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading pathways...
          </div>
        ) : pathways.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pathways found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pathway
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compound Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gene Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pathways.map((pathway, idx) => (
                  <tr
                    key={`${pathway.pathway}-${pathway.source}-${idx}`}
                    className={`hover:bg-gray-50 ${onPathwaySelect ? 'cursor-pointer' : ''}`}
                    onClick={() => onPathwaySelect?.(pathway.pathway, pathway.source)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {pathway.pathway}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pathway.source === 'HADEG'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {pathway.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pathway.compound_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pathway.gene_count}
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
