import type { PathwayTopDatum } from '../../types/database';
import { toPathwayTopItems } from '../../utils/compoundOverviewAdapters';
import { ChartCard } from '../charts/ChartCard';
import { HorizontalBarChart } from '../charts/HorizontalBarChart';

interface PathwayTopOverviewProps {
  rows: PathwayTopDatum[];
}

export function PathwayTopOverview({ rows }: PathwayTopOverviewProps) {
  const items = toPathwayTopItems(rows);

  return (
    <ChartCard title="Pathways (Top N)">
      <HorizontalBarChart
        items={items}
        emptyMessage="No pathway annotations available."
        valueFormatter={(value) => `${value}`}
      />
    </ChartCard>
  );
}
