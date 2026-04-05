import type { HeatmapCell } from '../charts/CategoricalHeatmap';
import { ChartCard } from '../charts/ChartCard';
import { CategoricalHeatmap } from '../charts/CategoricalHeatmap';
import { ChartLegend } from '../charts/ChartLegend';
import type { PathwayCoverageMatrix } from '../../types/database';
import { toPathwayCoverageHeatmap } from '../../utils/compoundOverviewAdapters';

interface PathwayCoverageOverviewProps {
  matrix: PathwayCoverageMatrix;
}

function pathwayCellColor(cell: HeatmapCell, normalizedValue: number) {
  if (cell.value <= 0) {
    return '#f3f4f6';
  }

  const ratio = Math.max(0.2, normalizedValue);
  if (cell.y === 'KEGG') {
    const lightness = 94 - ratio * 38;
    return `hsl(142, 60%, ${lightness}%)`;
  }
  if (cell.y === 'HADEG') {
    const lightness = 94 - ratio * 38;
    return `hsl(214, 70%, ${lightness}%)`;
  }

  const lightness = 96 - ratio * 30;
  return `hsl(215, 16%, ${lightness}%)`;
}

export function PathwayCoverageOverview({ matrix }: PathwayCoverageOverviewProps) {
  const heatmap = toPathwayCoverageHeatmap(matrix);

  return (
    <ChartCard title="Pathway Coverage" subtitle="Source x pathway with support intensity">
      <div className="space-y-3">
        <CategoricalHeatmap
          xLabels={heatmap.xLabels}
          yLabels={heatmap.yLabels}
          cells={heatmap.cells}
          emptyMessage="No pathway coverage data."
          showValues={false}
          getCellColor={pathwayCellColor}
        />
        <ChartLegend
          items={[
            { label: 'HADEG', color: '#60a5fa' },
            { label: 'KEGG', color: '#86efac' },
            { label: 'Compound pathway', color: '#cbd5e1' },
          ]}
        />
      </div>
    </ChartCard>
  );
}
