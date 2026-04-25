import type { GeneDetailOverviewResponse } from '@/types/database';
import { PathwayToxicityHeatmap } from '@/components/pathway-overview/PathwayToxicityHeatmap';
import { MetricCard } from '@/shared/ui/metric-card';

interface GeneOverviewTabProps {
  overview: GeneDetailOverviewResponse;
}

export function GeneOverviewTab({ overview }: GeneOverviewTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Linked Compounds" value={overview.summary.linked_compounds_total} className="rounded-2xl shadow-none" />
        <MetricCard label="With Toxicity" value={overview.summary.toxicity_compounds} className="rounded-2xl shadow-none" />
        <MetricCard label="Excluded (No ToxCSM)" value={overview.summary.excluded_no_toxicity} className="rounded-2xl shadow-none" />
        <MetricCard label="Endpoints" value={overview.summary.endpoint_count} className="rounded-2xl shadow-none" />
        <MetricCard
          label="Toxicity Coverage"
          value={overview.summary.toxicity_coverage_pct == null ? '-' : `${overview.summary.toxicity_coverage_pct}%`}
          className="rounded-2xl shadow-none"
        />
      </div>

      <PathwayToxicityHeatmap
        matrix={overview.toxicity_matrix}
        title="Toxicity Heatmap"
        subtitle="Compounds on Y-axis and grouped endpoints on top"
        rowLabel="Compound"
        rowLabelPlural="linked compounds"
        rowSort="provided"
        totalRowsInScope={overview.summary.linked_compounds_total}
      />
    </div>
  );
}
