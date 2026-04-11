import { ChartCard } from '../charts/ChartCard';
import { HorizontalBarChart, type HorizontalBarItem } from '../charts/HorizontalBarChart';
import { BoxplotChart } from '../charts/BoxplotChart';
import { RiskPotentialScatterChart } from './RiskPotentialScatterChart';
import { GuidedToxicityHeatmapMatrix } from './GuidedToxicityHeatmapMatrix';
import type {
  GuidedBoxplotVisualizationData,
  GuidedHeatmapMatrixVisualizationData,
  GuidedScatterVisualizationData,
  GuidedVisualizationResult,
  GuidedHorizontalBarVisualizationData,
} from '../../types/guided';

interface VisualizationRendererRegistryProps {
  visualizations: GuidedVisualizationResult[];
  onCompoundSelect: (cpd: string) => void;
}

function isHorizontalBarData(data: unknown): data is GuidedHorizontalBarVisualizationData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  const items = (data as GuidedHorizontalBarVisualizationData).items;
  return Array.isArray(items);
}

function isScatterData(data: unknown): data is GuidedScatterVisualizationData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  return Array.isArray((data as GuidedScatterVisualizationData).points);
}

function isHeatmapData(data: unknown): data is GuidedHeatmapMatrixVisualizationData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  const candidate = data as GuidedHeatmapMatrixVisualizationData;
  return Array.isArray(candidate.compounds) && Array.isArray(candidate.endpoints) && Array.isArray(candidate.cells);
}

function isBoxplotData(data: unknown): data is GuidedBoxplotVisualizationData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }
  return Array.isArray((data as GuidedBoxplotVisualizationData).groups);
}

function renderHorizontalBar(
  visualization: GuidedVisualizationResult,
  data: GuidedHorizontalBarVisualizationData
) {
  return (
    <ChartCard key={visualization.id} title={visualization.title} subtitle={visualization.subtitle || undefined}>
      <HorizontalBarChart
        items={data.items as HorizontalBarItem[]}
        emptyMessage={data.empty_message || 'No data available.'}
      />
    </ChartCard>
  );
}

function renderScatter(
  visualization: GuidedVisualizationResult,
  data: GuidedScatterVisualizationData,
  onCompoundSelect: (cpd: string) => void
) {
  const computedSubtitle = [
    visualization.subtitle || `x=${data.x_field}, y=${data.y_field}`,
    `x_scale=${data.x_scale}`,
    `thresholds x=${data.x_threshold}, y=${data.y_threshold}`,
    `basis=${data.threshold_basis}`,
  ].join(' | ');

  return (
    <ChartCard
      key={visualization.id}
      title={visualization.title}
      subtitle={computedSubtitle}
    >
      <RiskPotentialScatterChart
        points={data.points}
        xThreshold={data.x_threshold}
        yThreshold={data.y_threshold}
        xScaleMode={data.x_scale}
        yMetricLabel={data.y_metric_label}
        onSelectCompound={onCompoundSelect}
      />
    </ChartCard>
  );
}

export function VisualizationRendererRegistry({
  visualizations,
  onCompoundSelect,
}: VisualizationRendererRegistryProps) {
  if (!visualizations.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {visualizations.map((visualization) => {
        if (visualization.type === 'horizontal_bar' && isHorizontalBarData(visualization.data)) {
          return renderHorizontalBar(visualization, visualization.data);
        }

        if (visualization.type === 'scatter_quadrant' && isScatterData(visualization.data)) {
          return renderScatter(visualization, visualization.data, onCompoundSelect);
        }

        if (visualization.type === 'heatmap_matrix' && isHeatmapData(visualization.data)) {
          return (
            <ChartCard key={visualization.id} title={visualization.title} subtitle={visualization.subtitle || undefined}>
              <GuidedToxicityHeatmapMatrix matrix={visualization.data} />
            </ChartCard>
          );
        }

        if (visualization.type === 'boxplot' && isBoxplotData(visualization.data)) {
          return (
            <ChartCard key={visualization.id} title={visualization.title} subtitle={visualization.subtitle || undefined}>
              <BoxplotChart
                groups={visualization.data.groups}
                emptyMessage={visualization.data.empty_message || 'No data available.'}
                yLabel={visualization.data.y_label}
              />
            </ChartCard>
          );
        }

        if (visualization.type === 'table') {
          return null;
        }

        return (
          <ChartCard key={visualization.id} title={visualization.title} subtitle={visualization.subtitle || undefined}>
            <p className="text-sm text-gray-500">
              No renderer registered for visualization type "{visualization.type}".
            </p>
          </ChartCard>
        );
      })}
    </div>
  );
}
