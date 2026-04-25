import { useEffect, useState } from 'react';
import { getCompoundClassDetailOverview } from '@/services/api';
import type { CompoundClassDetailOverviewResponse } from '@/types/database';
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

interface CompoundClassDetailProps {
  compoundclass: string;
  onBack: () => void;
}

export function CompoundClassDetail({ compoundclass, onBack }: CompoundClassDetailProps) {
  const [overview, setOverview] = useState<CompoundClassDetailOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCompoundClassDetailOverview(compoundclass);
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
  }, [compoundclass]);

  if (loading) {
    return (
      <DetailStatusPanel
        status="loading"
        title="Loading compound class overview"
        message="Please wait while the compound class overview is prepared."
      />
    );
  }

  if (error) {
    return (
      <DetailStatusPanel
        status="error"
        title="Unable to load compound class overview."
        message={error}
        onBack={onBack}
        backLabel="Back to Compound Classes"
      />
    );
  }

  if (!overview) {
    return (
      <DetailStatusPanel
        status="not-found"
        title="Compound class not found."
        message="The selected compound class could not be loaded."
        onBack={onBack}
        backLabel="Back to Compound Classes"
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <DetailHeader
        title={overview.compoundclass}
        subtitle="BioRemPP compound class overview"
        onBack={onBack}
        backLabel="Back to Compound Classes"
      />

      <EntityStatStrip
        gridClassName="xl:grid-cols-6"
        items={[
          { label: 'KOs', value: overview.summary.ko_count, hint: 'distinct KOs' },
          { label: 'Genes', value: overview.summary.gene_count, hint: 'associated genes' },
          { label: 'Compounds', value: overview.summary.compound_count, hint: 'linked compounds' },
          { label: 'Reactions', value: overview.summary.reaction_ec_count, hint: 'EC annotations' },
          { label: 'Sources', value: overview.summary.source_count, hint: 'KEGG / HADEG / Class' },
          {
            label: 'Toxicity Coverage',
            value: overview.summary.toxicity_coverage_pct == null ? '-' : `${overview.summary.toxicity_coverage_pct}%`,
            hint: 'compounds with ToxCSM',
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
