import { GuidedInsightPanel } from '@/components/guided-analysis/GuidedInsightPanel';
import { GuidedSummaryCards } from '@/components/guided-analysis/GuidedSummaryCards';
import type {
  GuidedExecutionResponse,
  GuidedQueryDefinition,
} from '@/features/guided-analysis/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { GuidedExecutionMeta } from '@/features/guided-analysis/components/GuidedExecutionMeta';

interface GuidedQueryHeaderProps {
  query: GuidedQueryDefinition;
  execution: GuidedExecutionResponse | null;
}

export function GuidedQueryHeader({ query, execution }: GuidedQueryHeaderProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-xl">{query.title}</CardTitle>
        <GuidedExecutionMeta dataset={query.dataset} meta={execution?.meta} />
      </CardHeader>
      <CardContent className="space-y-3">
        <GuidedSummaryCards cards={execution?.summary_cards || []} />
        <GuidedInsightPanel insights={execution?.insights || []} />
      </CardContent>
    </Card>
  );
}
