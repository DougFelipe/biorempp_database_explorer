import type { GuidedHeatmapMatrixVisualizationData } from '../../types/guided';
import type { ToxicityHeatmapDatum } from '../../types/database';
import { formatEndpoint } from '../../utils/visualizationData';
import { toToxicityFacets } from '../../utils/toxicityEndpointGroups';
import {
  ChartTooltip,
  HeatmapLegend,
  VisualizationEmptyState,
} from '@/shared/visualization';

interface GuidedToxicityHeatmapMatrixProps {
  matrix: GuidedHeatmapMatrixVisualizationData;
}

function predictionCellColor(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '#f3f4f6';
  }

  const ratio = Math.max(0, Math.min(1, value));
  const hue = 130 - ratio * 106;
  const lightness = 86 - ratio * 30;
  return `hsl(${hue}, 78%, ${lightness}%)`;
}

const GROUP_HEADER_CLASS: Record<string, string> = {
  ecotoxicity: 'bg-blue-50 text-blue-800',
  genotoxicity_carcinogenicity: 'bg-rose-50 text-rose-800',
  nuclear_receptors: 'bg-indigo-50 text-indigo-800',
  stress_response: 'bg-amber-50 text-amber-800',
  organ_irritation: 'bg-emerald-50 text-emerald-800',
  other: 'bg-gray-50 text-gray-800',
};

export function GuidedToxicityHeatmapMatrix({ matrix }: GuidedToxicityHeatmapMatrixProps) {
  const endpointSeed: ToxicityHeatmapDatum[] = matrix.endpoints.map((endpoint) => ({
    endpoint,
    label: null,
    value: null,
    risk_bucket: 'unknown',
  }));
  const facets = toToxicityFacets(endpointSeed);
  const endpointOrder = facets.flatMap((facet) => facet.endpoints.map((endpoint) => endpoint.endpoint));
  const rows =
    Array.isArray(matrix.rows) && matrix.rows.length > 0
      ? matrix.rows
      : (matrix.compounds || []).map((compound) => ({
          id: compound.cpd,
          label: compound.compoundname || compound.cpd,
          secondary_label: compound.cpd,
        }));
  const rowLabel = matrix.row_label || 'Compound';
  const rowLabelPlural = matrix.row_label_plural || `${rowLabel}s`;
  const totalInScope = matrix.total_rows_in_scope ?? matrix.total_compounds_in_scope ?? rows.length;

  const cellMap = new Map(
    matrix.cells.map((cell) => [`${cell.row_id || cell.cpd || ''}|${cell.endpoint}`, cell] as const)
  );
  const minTableWidth = Math.max(760, 280 + endpointOrder.length * 52);

  if (endpointOrder.length === 0 || rows.length === 0) {
    return (
      <VisualizationEmptyState message="No toxicity matrix data available for this guided query." />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Showing {rows.length} of {totalInScope} {rowLabelPlural.toLowerCase()}
      </p>

      <HeatmapLegend />

      <div className="max-h-[560px] overflow-auto">
        <table
          className="w-full table-fixed border-separate border-spacing-1"
          style={{ minWidth: `${minTableWidth}px` }}
        >
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-white px-2 py-1 text-left text-[11px] font-medium text-gray-600 w-60">
                {rowLabel}
              </th>
              {facets.map((facet) => (
                <th
                  key={facet.key}
                  colSpan={facet.endpoints.length}
                  className={`sticky top-0 z-20 px-2 py-2 text-left text-[11px] font-semibold rounded ${
                    GROUP_HEADER_CLASS[facet.key] || GROUP_HEADER_CLASS.other
                  }`}
                  title={facet.title}
                >
                  {facet.title}
                </th>
              ))}
            </tr>

            <tr>
              <th className="sticky top-[34px] left-0 z-30 bg-white px-2 py-1 text-left text-[10px] font-medium text-gray-500">
                Endpoint
              </th>
              {facets.flatMap((facet) =>
                facet.endpoints.map((endpoint) => (
                  <th
                    key={`endpoint-${endpoint.endpoint}`}
                    className="sticky top-[34px] z-10 bg-white px-1 pt-1 pb-0 text-left text-[10px] font-medium text-gray-600 align-bottom h-16"
                  >
                    <div className="h-14 relative">
                      <span
                        title={formatEndpoint(endpoint.endpoint)}
                        className="absolute left-1 bottom-0 origin-bottom-left -rotate-45 whitespace-nowrap"
                      >
                        {endpoint.shortLabel}
                      </span>
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th
                  className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-xs font-medium text-gray-700"
                  title={row.secondary_label ? `${row.label} (${row.secondary_label})` : row.label}
                >
                  <span className="block truncate max-w-[220px]">{row.label}</span>
                  {row.secondary_label ? (
                    <span className="block text-[10px] text-gray-400 font-normal">{row.secondary_label}</span>
                  ) : null}
                </th>

                {endpointOrder.map((endpoint) => {
                  const cell = cellMap.get(`${row.id}|${endpoint}`);
                  const value = cell?.value ?? null;
                  const fullEndpoint = formatEndpoint(endpoint);
                  const tooltip = `${row.label} | ${fullEndpoint}: ${
                    value === null ? '-' : value.toFixed(4)
                  }${cell?.label ? ` (${cell.label})` : ''}`;
                  return (
                    <td key={`${row.id}|${endpoint}`} className="p-0">
                      <ChartTooltip
                        content={tooltip}
                        className="h-7 rounded border border-gray-100"
                        style={{ backgroundColor: predictionCellColor(value) }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
