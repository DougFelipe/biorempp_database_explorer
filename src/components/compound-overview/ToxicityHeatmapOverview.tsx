import { ChartCard } from '../charts/ChartCard';
import { ChartLegend } from '../charts/ChartLegend';
import type { ToxicityHeatmapDatum } from '../../types/database';
import { riskBucketLabel, riskBucketToScore } from '../../utils/compoundOverviewAdapters';
import { toToxicityFacets } from '../../utils/toxicityEndpointGroups';

interface ToxicityHeatmapOverviewProps {
  rows: ToxicityHeatmapDatum[];
}

function riskBucketColor(bucket: ToxicityHeatmapDatum['risk_bucket']) {
  if (bucket === 'high_risk') return '#fca5a5';
  if (bucket === 'medium_risk') return '#fde68a';
  if (bucket === 'low_risk') return '#86efac';
  return '#e5e7eb';
}

function predictionCellColor(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '#f3f4f6';
  }

  const ratio = Math.max(0, Math.min(1, value));
  const lightness = 96 - ratio * 42;
  return `hsl(24, 100%, ${lightness}%)`;
}

const GROUP_HEADER_CLASS: Record<string, string> = {
  ecotoxicity: 'bg-blue-50 text-blue-800',
  genotoxicity_carcinogenicity: 'bg-rose-50 text-rose-800',
  nuclear_receptors: 'bg-indigo-50 text-indigo-800',
  stress_response: 'bg-amber-50 text-amber-800',
  organ_irritation: 'bg-emerald-50 text-emerald-800',
  other: 'bg-gray-50 text-gray-800',
};

const GROUP_DISPLAY_LABEL: Record<string, string> = {
  ecotoxicity: 'Ecotoxicity',
  genotoxicity_carcinogenicity: 'Genotoxicity & Carc.',
  nuclear_receptors: 'Nuclear Receptors (NR)',
  stress_response: 'Stress Response (SR)',
  organ_irritation: 'Organ / Irritation',
  other: 'Other',
};

export function ToxicityHeatmapOverview({ rows }: ToxicityHeatmapOverviewProps) {
  const facets = toToxicityFacets(rows);

  const flatEndpoints = facets.flatMap((facet) =>
    facet.endpoints.map((endpoint) => ({
      ...endpoint,
      groupKey: facet.key,
      groupTitle: facet.title,
      predictionValue: facet.prediction[endpoint.endpoint],
      riskBucket: facet.risk[endpoint.endpoint],
    }))
  );

  const groupHeaders = facets.map((facet) => ({
    key: facet.key,
    title: facet.title,
    colSpan: facet.endpoints.length,
  }));

  return (
    <ChartCard title="Toxicity Endpoints" subtitle="Unified domain heatmap with endpoint highlights">
      {flatEndpoints.length === 0 ? (
        <p className="text-sm text-gray-500">No toxicity profile available.</p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <ChartLegend
                items={[
                  { label: riskBucketLabel('high_risk'), color: '#fca5a5' },
                  { label: riskBucketLabel('medium_risk'), color: '#fde68a' },
                  { label: riskBucketLabel('low_risk'), color: '#86efac' },
                ]}
              />
              <div className="text-[11px] text-gray-600 whitespace-nowrap">Prediction scale</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Low</span>
              <div
                className="h-2 flex-1 rounded border border-gray-200"
                style={{ background: 'linear-gradient(90deg, hsl(24,100%,96%), hsl(24,100%,54%))' }}
              />
              <span className="text-[10px] text-gray-500">High</span>
            </div>
            <p className="text-xs text-gray-600">
              Para mais informacoes, verifique o site oficial do ToxCSM:{' '}
              <a
                href="https://biosig.lab.uq.edu.au/toxcsm/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 hover:text-blue-800 underline"
              >
                biosig.lab.uq.edu.au/toxcsm
              </a>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1024px] w-full table-fixed border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-20 px-2 py-1 text-left text-[10px] font-medium text-gray-500 bg-gray-50 rounded">
                    Domain
                  </th>
                  {groupHeaders.map((group) => (
                    <th
                      key={group.key}
                      colSpan={group.colSpan}
                      className={`px-2 py-2 text-left text-[11px] font-semibold rounded ${
                        GROUP_HEADER_CLASS[group.key] || GROUP_HEADER_CLASS.other
                      }`}
                      title={group.title}
                    >
                      <span className="block truncate">
                        {GROUP_DISPLAY_LABEL[group.key] || group.title}
                      </span>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 rounded">Endpoint</th>
                  {flatEndpoints.map((endpoint) => {
                    return (
                      <th
                        key={`endpoint-${endpoint.endpoint}`}
                        className="px-1 pt-1 pb-0 text-left text-[10px] font-medium text-gray-600 align-bottom h-16"
                      >
                        <div className="h-14 relative">
                          <span
                            title={endpoint.fullLabel}
                            className="absolute left-1 bottom-0 origin-bottom-left -rotate-45 whitespace-nowrap"
                          >
                            {endpoint.shortLabel}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                <tr>
                  <th className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded">Prediction</th>
                  {flatEndpoints.map((endpoint) => {
                    return (
                      <td
                        key={`prediction-${endpoint.endpoint}`}
                        className="p-0"
                      >
                        <div
                          className="h-7 rounded border border-gray-200 flex items-center justify-center text-[10px] text-gray-700 font-medium"
                          style={{ backgroundColor: predictionCellColor(endpoint.predictionValue) }}
                          title={`${endpoint.fullLabel}: prediction=${
                            endpoint.predictionValue === null ? '-' : endpoint.predictionValue.toFixed(4)
                          }`}
                        >
                          {endpoint.predictionValue === null ? '-' : endpoint.predictionValue.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded">Risk</th>
                  {flatEndpoints.map((endpoint) => {
                    const riskText = riskBucketLabel(endpoint.riskBucket);
                    return (
                      <td
                        key={`risk-${endpoint.endpoint}`}
                        className="p-0"
                      >
                        <div
                          className="h-7 rounded border border-gray-200 flex items-center justify-center text-[10px] text-gray-700 font-semibold"
                          style={{ backgroundColor: riskBucketColor(endpoint.riskBucket) }}
                          title={`${endpoint.fullLabel}: ${riskText} (${
                            endpoint.riskLabel || 'no label'
                          }) | score=${riskBucketToScore(endpoint.riskBucket).toFixed(2)}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
