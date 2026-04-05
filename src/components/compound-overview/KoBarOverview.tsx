import type { KoBarDatum } from '../../types/database';
import { toKoBarItems } from '../../utils/compoundOverviewAdapters';
import { ChartCard } from '../charts/ChartCard';
import { HorizontalBarChart } from '../charts/HorizontalBarChart';

interface KoBarOverviewProps {
  rows: KoBarDatum[];
}

export function KoBarOverview({ rows }: KoBarOverviewProps) {
  const items = toKoBarItems(rows);

  return (
    <ChartCard title="Gene Function (by KO)">
      <HorizontalBarChart
        items={items}
        emptyMessage="No KO distribution available."
        valueFormatter={(value) => `${value}`}
      />
    </ChartCard>
  );
}
