import { renderGuidedVisualization } from '@/features/guided-analysis/components/visualizationRenderers';
import type { GuidedVisualizationResult } from '../../types/guided';

interface VisualizationRendererRegistryProps {
  visualizations: GuidedVisualizationResult[];
  onCompoundSelect: (cpd: string) => void;
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
      {visualizations.map((visualization) =>
        renderGuidedVisualization({
          visualization,
          onCompoundSelect,
        })
      )}
    </div>
  );
}
