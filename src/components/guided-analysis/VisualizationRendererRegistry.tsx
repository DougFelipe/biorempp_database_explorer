import { ChartCard } from '../charts/ChartCard';
import { HorizontalBarChart, type HorizontalBarItem } from '../charts/HorizontalBarChart';
import { RiskPotentialScatterChart } from './RiskPotentialScatterChart';
import type {
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
  return (
    <ChartCard
      key={visualization.id}
      title={visualization.title}
      subtitle={
        visualization.subtitle ||
        `x=${data.x_field}, y=${data.y_field}, thresholds x=${data.x_threshold}, y=${data.y_threshold}`
      }
    >
      <RiskPotentialScatterChart
        points={data.points}
        xThreshold={data.x_threshold}
        yThreshold={data.y_threshold}
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

        if (visualization.type === 'heatmap_matrix') {
          return (
            <ChartCard key={visualization.id} title={visualization.title} subtitle={visualization.subtitle || undefined}>
              <p className="text-sm text-gray-500">
                Heatmap renderer is ready for upcoming guided use cases.
              </p>
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

