import { GuidedResultTable } from '@/components/guided-analysis/GuidedResultTable';
import { VisualizationRendererRegistry } from '@/components/guided-analysis/VisualizationRendererRegistry';
import type { GuidedExecutionResponse } from '@/features/guided-analysis/types';
import { LoadingState } from '@/shared/feedback';
import { GuidedStatusBanner } from '@/features/guided-analysis/components/GuidedStatusBanner';

interface GuidedResultsSectionProps {
  execution: GuidedExecutionResponse | null;
  executionLoading: boolean;
  executionError: string | null;
  onCompoundSelect: (cpd: string) => void;
  onPageChange: (page: number) => void;
}

export function GuidedResultsSection({
  execution,
  executionLoading,
  executionError,
  onCompoundSelect,
  onPageChange,
}: GuidedResultsSectionProps) {
  if (!execution && executionLoading) {
    return (
      <LoadingState
        title="Executing query..."
        message="Preparing guided results and visualizations."
      />
    );
  }

  if (executionError) {
    return (
      <GuidedStatusBanner tone="error">
        Unable to execute guided query: {executionError}
      </GuidedStatusBanner>
    );
  }

  if (!execution) {
    return null;
  }

  return (
    <div className="space-y-4" aria-busy={executionLoading}>
      {executionLoading ? (
        <GuidedStatusBanner tone="info">Refreshing results...</GuidedStatusBanner>
      ) : null}
      <VisualizationRendererRegistry
        visualizations={execution.visualizations}
        onCompoundSelect={onCompoundSelect}
      />
      <GuidedResultTable table={execution.table} onCompoundSelect={onCompoundSelect} onPageChange={onPageChange} />
    </div>
  );
}
