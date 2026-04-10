import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getCompoundClasses } from '../services/api';
import type { CompoundClassFilters, CompoundClassSummary } from '../types/database';
import { Pagination } from './Pagination';

interface CompoundClassExplorerProps {
  onCompoundClassSelect?: (compoundclass: string) => void;
}

export function CompoundClassExplorer({ onCompoundClassSelect }: CompoundClassExplorerProps) {
  const [classes, setClasses] = useState<CompoundClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);
  const [filters, setFilters] = useState<CompoundClassFilters>({});
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadClasses();
  }, [currentPage, filters]);

  async function loadClasses() {
    setLoading(true);
    try {
      const response = await getCompoundClasses(filters, { page: currentPage, pageSize });
      setClasses(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading compound classes:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof CompoundClassFilters, value: string | undefined) {
    setFilters((prev) => {
      const next = { ...prev };
      if (!value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Compound Classes</h2>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by compound class..."
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
            Showing {classes.length} of {total} classes
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading compound classes...</div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No compound classes found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compound Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compound Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KO Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gene Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pathway Annotations
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classes.map((item) => (
                  <tr
                    key={item.compoundclass}
                    className={`hover:bg-gray-50 ${onCompoundClassSelect ? 'cursor-pointer' : ''}`}
                    onClick={() => onCompoundClassSelect?.(item.compoundclass)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.compoundclass}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.compound_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.ko_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.gene_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.pathway_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    </div>
  );
}
