import { useEffect, useState } from 'react';
import type { CompoundOverviewResponse } from '../types/database';
import { getCompoundOverview } from '../services/api';
import { KoBarOverview } from './compound-overview/KoBarOverview';
import { PathwayTopOverview } from './compound-overview/PathwayTopOverview';
import { PathwayCoverageOverview } from './compound-overview/PathwayCoverageOverview';
import { ToxicityHeatmapOverview } from './compound-overview/ToxicityHeatmapOverview';

interface CompoundOverviewTabProps {
  cpd: string;
}

export function CompoundOverviewTab({ cpd }: CompoundOverviewTabProps) {
  const [overview, setOverview] = useState<CompoundOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCompoundOverview(cpd, { top_ko: 10, top_pathways: 10 });
        if (cancelled) {
          return;
        }
        setOverview(data);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [cpd]);

  if (loading) {
    return <p className="text-gray-500 text-center py-8">Loading overview charts...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
        Unable to load overview charts: {error}
      </div>
    );
  }

  if (!overview) {
    return <p className="text-gray-500 text-center py-8">No overview data available.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <KoBarOverview rows={overview.ko_bar} />
        <PathwayTopOverview title="Top KEGG Pathways" rows={overview.pathways_top_kegg} />
        <PathwayTopOverview title="Top HADEG Pathways" rows={overview.pathways_top_hadeg} />
      </div>
      <PathwayCoverageOverview matrix={overview.pathway_coverage} />
      <ToxicityHeatmapOverview rows={overview.toxicity_heatmap} />
    </div>
  );
}
