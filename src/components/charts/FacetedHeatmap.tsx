interface FacetedHeatmapColumn {
  key: string;
  shortLabel: string;
  fullLabel: string;
}

interface FacetedHeatmapCell {
  key: string;
  valueLabel: string;
  title: string;
  backgroundColor: string;
  textColor?: string;
}

interface FacetedHeatmapRow {
  key: string;
  label: string;
  cells: FacetedHeatmapCell[];
}

interface FacetedHeatmapFacet {
  key: string;
  title: string;
  columns: FacetedHeatmapColumn[];
  rows: FacetedHeatmapRow[];
}

interface FacetedHeatmapProps {
  facets: FacetedHeatmapFacet[];
  emptyMessage: string;
}

export function FacetedHeatmap({ facets, emptyMessage }: FacetedHeatmapProps) {
  if (facets.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {facets.map((facet) => (
        <section key={facet.key} className="rounded-lg border border-gray-200 bg-white p-3">
          <h5 className="mb-2 text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
            {facet.title}
          </h5>

          <table className="w-full table-fixed border-separate border-spacing-1">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-16 px-1 py-1 text-left text-[10px] font-medium text-gray-500">Metric</th>
                {facet.columns.map((column) => (
                  <th
                    key={`${facet.key}-${column.key}`}
                    className="px-1 py-1 text-left text-[10px] font-medium text-gray-500"
                  >
                    <span title={column.fullLabel} className="block truncate">
                      {column.shortLabel}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {facet.rows.map((row) => (
                <tr key={`${facet.key}-${row.key}`}>
                  <th className="px-1 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded">
                    {row.label}
                  </th>
                  {row.cells.map((cell) => (
                    <td key={`${facet.key}-${row.key}-${cell.key}`} className="p-0">
                      <div
                        className="h-7 rounded border border-gray-200 flex items-center justify-center text-[10px] font-medium"
                        style={{
                          backgroundColor: cell.backgroundColor,
                          color: cell.textColor ?? '#374151',
                        }}
                        title={cell.title}
                      >
                        {cell.valueLabel}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
