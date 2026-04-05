import type { HeatmapCell } from '../charts/CategoricalHeatmap';
import { ChartCard } from '../charts/ChartCard';
import { CategoricalHeatmap } from '../charts/CategoricalHeatmap';
import { ChartLegend } from '../charts/ChartLegend';
import type { ToxicityHeatmapDatum } from '../../types/database';
import {
  riskBucketLabel,
  toToxicityHeatmapMatrix,
} from '../../utils/compoundOverviewAdapters';

interface ToxicityHeatmapOverviewProps {
  rows: ToxicityHeatmapDatum[];
}

function toxicityCellColor(cell: HeatmapCell, normalizedValue: number) {
  if (cell.x === 'Risk Bucket') {
    if (cell.colorKey === 'high_risk') return '#fca5a5';
    if (cell.colorKey === 'medium_risk') return '#fde68a';
    if (cell.colorKey === 'low_risk') return '#86efac';
    return '#e5e7eb';
  }

  const ratio = Math.max(0, Math.min(1, normalizedValue));
  const lightness = 96 - ratio * 42;
  return `hsl(24, 100%, ${lightness}%)`;
}

export function ToxicityHeatmapOverview({ rows }: ToxicityHeatmapOverviewProps) {
  const heatmap = toToxicityHeatmapMatrix(rows);

  return (
    <ChartCard title="Toxicity Endpoints">
      <div className="space-y-3">
        <CategoricalHeatmap
          xLabels={heatmap.xLabels}
          yLabels={heatmap.yLabels}
          cells={heatmap.cells}
          emptyMessage="No toxicity profile available."
          showValues={false}
          getCellColor={toxicityCellColor}
        />
        <ChartLegend
          items={[
            { label: riskBucketLabel('high_risk'), color: '#fca5a5' },
            { label: riskBucketLabel('medium_risk'), color: '#fde68a' },
            { label: riskBucketLabel('low_risk'), color: '#86efac' },
          ]}
        />
      </div>
    </ChartCard>
  );
}
