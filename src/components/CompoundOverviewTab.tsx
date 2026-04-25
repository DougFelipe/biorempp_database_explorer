import type { CompoundOverviewResponse } from '@/types/database';
import { KoBarOverview } from '@/components/compound-overview/KoBarOverview';
import { PathwayTopOverview } from '@/components/compound-overview/PathwayTopOverview';
import { ToxicityHeatmapOverview } from '@/components/compound-overview/ToxicityHeatmapOverview';

interface CompoundOverviewTabProps {
  overview: CompoundOverviewResponse;
}

export function CompoundOverviewTab({ overview }: CompoundOverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <KoBarOverview rows={overview.ko_bar} />
        <PathwayTopOverview title="Top KEGG Pathways" rows={overview.pathways_top_kegg} />
        <PathwayTopOverview title="Top HADEG Pathways" rows={overview.pathways_top_hadeg} />
      </div>
      <ToxicityHeatmapOverview rows={overview.toxicity_heatmap} />
    </div>
  );
}
