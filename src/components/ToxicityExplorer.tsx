import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  getToxicityData,
  getToxicityEndpoints,
  getToxicityLabels,
  getUniqueCompoundClasses,
} from '../services/api';
import type { ToxicityEndpoint, ToxicityFilters } from '../types/database';
import { Pagination } from './Pagination';

function formatEndpoint(endpoint: string) {
  return endpoint
    .replace(/_/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ToxicityExplorer() {
  const [records, setRecords] = useState<ToxicityEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(50);

  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [compoundClasses, setCompoundClasses] = useState<string[]>([]);

  const [filters, setFilters] = useState<ToxicityFilters>({});
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadData();
  }, [currentPage, filters]);

  useEffect(() => {
    loadLabels();
  }, [filters.endpoint]);

  async function loadMetadata() {
    try {
      const [availableEndpoints, classes] = await Promise.all([
        getToxicityEndpoints(),
        getUniqueCompoundClasses(),
      ]);

      setEndpoints(availableEndpoints);
      setCompoundClasses(classes);

      if (availableEndpoints.length > 0) {
        setFilters((prev) => {
          if (prev.endpoint) {
            return prev;
          }
          return { ...prev, endpoint: availableEndpoints[0] };
        });
      }
    } catch (error) {
      console.error('Error loading toxicity metadata:', error);
    }
  }

  async function loadLabels() {
    try {
      const availableLabels = await getToxicityLabels(filters.endpoint);
      setLabels(availableLabels);
    } catch (error) {
      console.error('Error loading toxicity labels:', error);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const response = await getToxicityData(filters, { page: currentPage, pageSize });
      setRecords(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading toxicity data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: keyof ToxicityFilters, value: string | number | undefined) {
    setFilters((prev) => {
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
    const endpoint = filters.endpoint;
    setFilters(endpoint ? { endpoint } : {});
    setSearchInput('');
    setCurrentPage(1);
  }

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Toxicity Explorer</h2>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint
            </label>
            <select
              value={filters.endpoint || ''}
              onChange={(e) => handleFilterChange('endpoint', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Endpoints</option>
              {endpoints.map((endpoint) => (
                <option key={endpoint} value={endpoint}>{formatEndpoint(endpoint)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <select
              value={filters.label || ''}
              onChange={(e) => handleFilterChange('label', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Labels</option>
              {labels.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

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
              {compoundClasses.map((compoundClass) => (
                <option key={compoundClass} value={compoundClass}>{compoundClass}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Value
            </label>
            <input
              type="number"
              step="0.0001"
              value={filters.value_min || ''}
              onChange={(e) => handleFilterChange('value_min', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Min"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Value
            </label>
            <input
              type="number"
              step="0.0001"
              value={filters.value_max || ''}
              onChange={(e) => handleFilterChange('value_max', e.target.value ? Number(e.target.value) : undefined)}
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
            Showing {records.length} of {total} endpoint records
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading toxicity records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No toxicity records found matching your filters.
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
                    Compound Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={`${record.cpd}-${record.endpoint}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {record.cpd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.compoundname || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.compoundclass || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatEndpoint(record.endpoint)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.label || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                      {record.value !== null ? record.value.toFixed(4) : '-'}
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
