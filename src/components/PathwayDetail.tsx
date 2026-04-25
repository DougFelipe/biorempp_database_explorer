import { useEffect, useState } from 'react';
import { getPathwayDetailOverview } from '@/services/api';
import type { PathwayDetailOverviewResponse } from '@/types/database';
import { ChartCard } from '@/components/charts/ChartCard';
import { DonutChart } from '@/components/charts/DonutChart';
import { HorizontalBarChart } from '@/components/charts/HorizontalBarChart';
import { PathwayToxicityHeatmap } from '@/components/pathway-overview/PathwayToxicityHeatmap';
import {
  toPathwayEcDonutSlices,
  toPathwayGeneBarItems,
  toPathwayKoBarItems,
} from '@/utils/pathwayOverviewAdapters';
import { Card, DetailHeader, DetailStatusPanel, EntityStatStrip } from '@/shared/ui';

interface PathwayDetailProps {
  pathway: string;
  source?: string;
  onBack: () => void;
}

export function PathwayDetail({ pathway, source, onBack }: PathwayDetailProps) {
  const [overview, setOverview] = useState<PathwayDetailOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPathwayDetailOverview(pathway, { source });
        if (cancelled) {
          return;
        }
        setOverview(data);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setOverview(null);
        setError(loadError instanceof Error ? loadError.message : 'Unknown error');
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
  }, [pathway, source]);

  if (loading) {
    return (
      <DetailStatusPanel
        status="loading"
        title="Loading pathway overview"
        message="Please wait while the pathway overview is prepared."
      />
    );
  }

  if (error) {
    return (
      <DetailStatusPanel
        status="error"
        title="Unable to load pathway overview."
        message={error}
        onBack={onBack}
        backLabel="Back to Pathways"
      />
    );
  }

  if (!overview) {
    return (
      <DetailStatusPanel
        status="not-found"
        title="Pathway not found."
        message="The selected pathway could not be loaded."
        onBack={onBack}
        backLabel="Back to Pathways"
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <DetailHeader
        title={overview.pathway}
        subtitle={`Source scope: ${overview.selected_source === 'ALL' ? 'All sources' : overview.selected_source}`}
        onBack={onBack}
        backLabel="Back to Pathways"
      />

      <EntityStatStrip
        gridClassName="xl:grid-cols-6"
        items={[
          { label: 'KOs', value: overview.summary.ko_count, hint: 'distinct KOs' },
          { label: 'Genes', value: overview.summary.gene_count, hint: 'associated genes' },
          { label: 'Compounds', value: overview.summary.compound_count, hint: 'linked compounds' },
          { label: 'Reactions', value: overview.summary.reaction_ec_count, hint: 'EC annotations' },
          {
            label: 'Sources',
            value: overview.summary.source_count,
            hint: overview.selected_source === 'ALL' ? 'KEGG + HADEG' : overview.selected_source,
          },
          {
            label: 'Coverage',
            value: overview.summary.ko_overlap_pct == null ? '-' : `${overview.summary.ko_overlap_pct}%`,
            hint: 'KO overlap',
          },
        ]}
      />

      <div className="space-y-4 px-6 py-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ChartCard title="KO Distribution" subtitle="Top KOs by linked compounds">
            <HorizontalBarChart
              items={toPathwayKoBarItems(overview.ko_distribution)}
              emptyMessage="No KO distribution available."
            />
          </ChartCard>

          <ChartCard title="Gene Distribution" subtitle="Top genes by linked compounds">
            <HorizontalBarChart
              items={toPathwayGeneBarItems(overview.gene_distribution)}
              emptyMessage="No gene distribution available."
            />
          </ChartCard>

          <ChartCard title="EC Number Overview" subtitle="Enzyme Commission classes">
            <DonutChart
              slices={toPathwayEcDonutSlices(overview.ec_class_distribution)}
              emptyMessage="No EC class distribution available."
              centerLabel="EC"
            />
          </ChartCard>
        </div>

        <PathwayToxicityHeatmap matrix={overview.toxicity_matrix} />
      </div>
    </Card>
  );
}
