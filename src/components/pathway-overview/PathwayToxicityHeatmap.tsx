import type { PathwayToxicityMatrix } from '../../types/database';
import type { ToxicityHeatmapDatum } from '../../types/database';
import { ChartCard } from '../charts/ChartCard';
import { formatEndpoint } from '../../utils/visualizationData';
import { toToxicityFacets } from '../../utils/toxicityEndpointGroups';

interface PathwayToxicityHeatmapProps {
  matrix: PathwayToxicityMatrix;
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

export function PathwayToxicityHeatmap({ matrix }: PathwayToxicityHeatmapProps) {
  const endpointSeed: ToxicityHeatmapDatum[] = matrix.endpoints.map((endpoint) => ({
    endpoint,
    label: null,
    value: null,
    risk_bucket: 'unknown',
  }));
  const facets = toToxicityFacets(endpointSeed);
  const endpointOrder = facets.flatMap((facet) => facet.endpoints.map((endpoint) => endpoint.endpoint));

  const cellMap = new Map(
    matrix.cells.map((cell) => [`${cell.cpd}|${cell.endpoint}`, cell] as const)
  );
  const minTableWidth = Math.max(760, 280 + endpointOrder.length * 52);

  const compounds = matrix.compounds
    .map((compound) => {
      let sum = 0;
      let count = 0;
      for (const endpoint of endpointOrder) {
        const value = cellMap.get(`${compound.cpd}|${endpoint}`)?.value ?? null;
        if (value !== null && Number.isFinite(value)) {
          sum += value;
          count += 1;
        }
      }
      return {
        ...compound,
        meanToxicity: count > 0 ? sum / count : -1,
      };
    })
    .sort((a, b) => b.meanToxicity - a.meanToxicity || (a.compoundname || a.cpd).localeCompare(b.compoundname || b.cpd));

  if (endpointOrder.length === 0 || compounds.length === 0) {
    return (
      <ChartCard title="Toxicity Heatmap" subtitle="No toxicity data available for compounds in this pathway.">
        <p className="text-sm text-gray-500">No matrix data available.</p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Toxicity Heatmap" subtitle="Compounds on Y-axis and grouped endpoints on top">
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          Showing {compounds.length} of {matrix.compounds.length} compounds
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Low</span>
          <div
            className="h-2 flex-1 rounded border border-gray-200"
            style={{ background: 'linear-gradient(90deg, hsl(130,78%,86%), hsl(24,78%,56%))' }}
          />
          <span>High</span>
        </div>

        <div className="max-h-[480px] overflow-auto">
          <table
            className="w-full table-fixed border-separate border-spacing-1"
            style={{ minWidth: `${minTableWidth}px` }}
          >
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-30 bg-white px-2 py-1 text-left text-[11px] font-medium text-gray-600 w-60">
                  Compound
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
              {compounds.map((compound) => (
                <tr key={compound.cpd}>
                  <th
                    className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-xs font-medium text-gray-700"
                    title={`${compound.compoundname || compound.cpd} (${compound.cpd})`}
                  >
                    <span className="block truncate max-w-[220px]">{compound.compoundname || compound.cpd}</span>
                    <span className="block text-[10px] text-gray-400 font-normal">{compound.cpd}</span>
                  </th>

                  {endpointOrder.map((endpoint) => {
                    const cell = cellMap.get(`${compound.cpd}|${endpoint}`);
                    const value = cell?.value ?? null;
                    return (
                      <td key={`${compound.cpd}|${endpoint}`} className="p-0">
                        <div
                          className="h-7 rounded border border-gray-100"
                          style={{ backgroundColor: predictionCellColor(value) }}
                          title={`${compound.compoundname || compound.cpd} | ${formatEndpoint(endpoint)}: ${
                            value === null ? '-' : value.toFixed(4)
                          }`}
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
    </ChartCard>
  );
}
