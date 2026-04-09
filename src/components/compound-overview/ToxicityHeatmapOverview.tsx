import { ChartCard } from '../charts/ChartCard';
import { ChartLegend } from '../charts/ChartLegend';
import { FacetedHeatmap } from '../charts/FacetedHeatmap';
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

function riskAbbreviation(bucket: ToxicityHeatmapDatum['risk_bucket']) {
  if (bucket === 'high_risk') return 'H';
  if (bucket === 'medium_risk') return 'M';
  if (bucket === 'low_risk') return 'L';
  return '-';
}

export function ToxicityHeatmapOverview({ rows }: ToxicityHeatmapOverviewProps) {
  const facets = toToxicityFacets(rows).map((facet) => {
    const endpointsByKey = new Map(facet.endpoints.map((endpoint) => [endpoint.endpoint, endpoint]));

    return {
      key: facet.key,
      title: facet.title,
      columns: facet.endpoints.map((endpoint) => ({
        key: endpoint.endpoint,
        shortLabel: endpoint.shortLabel,
        fullLabel: endpoint.fullLabel,
      })),
      rows: [
        {
          key: 'prediction',
          label: 'Prediction',
          cells: facet.orderedEndpoints.map((endpointKey) => {
            const endpointData = endpointsByKey.get(endpointKey);
            const predictionValue = facet.prediction[endpointKey];
            return {
              key: endpointKey,
              valueLabel: predictionValue === null ? '-' : predictionValue.toFixed(2),
              title: `${endpointData?.fullLabel ?? endpointKey}: prediction=${
                predictionValue === null ? '-' : predictionValue.toFixed(4)
              }`,
              backgroundColor: predictionCellColor(predictionValue),
            };
          }),
        },
        {
          key: 'risk',
          label: 'Risk',
          cells: facet.orderedEndpoints.map((endpointKey) => {
            const endpointData = endpointsByKey.get(endpointKey);
            const riskBucket = facet.risk[endpointKey];
            const riskText = riskBucketLabel(riskBucket);
            return {
              key: endpointKey,
              valueLabel: riskAbbreviation(riskBucket),
              title: `${endpointData?.fullLabel ?? endpointKey}: ${riskText} (${
                endpointData?.riskLabel || 'no label'
              }) | score=${riskBucketToScore(riskBucket).toFixed(2)}`,
              backgroundColor: riskBucketColor(riskBucket),
            };
          }),
        },
      ],
    };
  });

  return (
    <ChartCard title="Toxicity Endpoints" subtitle="Faceted by domain (prediction + risk)">
      {facets.length === 0 ? (
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
          </div>

          <FacetedHeatmap facets={facets} emptyMessage="No toxicity profile available." />
        </div>
      )}
    </ChartCard>
  );
}
