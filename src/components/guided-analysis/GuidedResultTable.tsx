import { Pagination } from '../Pagination';
import type { GuidedTableResult } from '../../types/guided';

interface GuidedResultTableProps {
  table: GuidedTableResult | null;
  onCompoundSelect: (cpd: string) => void;
  onPageChange: (page: number) => void;
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

export function GuidedResultTable({ table, onCompoundSelect, onPageChange }: GuidedResultTableProps) {
  if (!table) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="text-base font-semibold text-gray-900">{table.title}</h4>
        {table.subtitle ? (
          <p className="text-sm text-gray-600 mt-1">{table.subtitle}</p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.rows.map((row, rowIndex) => {
              const clickField = table.row_click_field;
              const clickValue = clickField ? row[clickField] : null;
              const clickable = typeof clickValue === 'string' && clickValue.trim().length > 0;
              return (
                <tr
                  key={`${table.id}-${rowIndex}`}
                  onClick={clickable ? () => onCompoundSelect(String(clickValue)) : undefined}
                  className={clickable ? 'hover:bg-blue-50 cursor-pointer transition-colors' : undefined}
                >
                  {table.columns.map((column) => {
                    const rawValue = row[column.id];
                    const displayValue = formatCellValue(rawValue);
                    if (column.type === 'compound_link' && typeof rawValue === 'string' && rawValue.trim() !== '') {
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {rawValue}
                        </td>
                      );
                    }

                    return (
                      <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {table.rows.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-sm text-gray-500" colSpan={Math.max(1, table.columns.length)}>
                  {table.empty_message || 'No results available.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {table.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination currentPage={table.page} totalPages={table.totalPages} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

