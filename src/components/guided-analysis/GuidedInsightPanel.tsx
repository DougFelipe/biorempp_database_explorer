import type { GuidedInsightDefinition } from '../../types/guided';

interface GuidedInsightPanelProps {
  insights: GuidedInsightDefinition[];
}

export function GuidedInsightPanel({ insights }: GuidedInsightPanelProps) {
  if (!insights.length) {
    return null;
  }

  return (
    <div className="space-y-1">
      {insights.map((insight) => (
        <p key={insight.id} className="text-sm text-blue-700">
          Insight: {insight.text}
        </p>
      ))}
    </div>
  );
}

