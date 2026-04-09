import type { PathwayTopDatum } from '../../types/database';
import { toPathwayTopItems } from '../../utils/compoundOverviewAdapters';
import { ChartCard } from '../charts/ChartCard';
import { HorizontalBarChart } from '../charts/HorizontalBarChart';

interface PathwayTopOverviewProps {
  title: string;
  rows: PathwayTopDatum[];
}

export function PathwayTopOverview({ title, rows }: PathwayTopOverviewProps) {
  const items = toPathwayTopItems(rows);

  return (
    <ChartCard title={title} subtitle="Distinct KO↔Pathway relations">
      <HorizontalBarChart
        items={items}
        emptyMessage="No pathway annotations available."
        valueFormatter={(value) => `${value}`}
      />
    </ChartCard>
  );
}
