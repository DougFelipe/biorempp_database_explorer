import { Badge, Card, CardContent, SectionHeader } from '@/shared/ui';

interface UserGuideWorkflowSectionProps {
  title: string;
  steps: string[];
}

export function UserGuideWorkflowSection({ title, steps }: UserGuideWorkflowSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-6 px-6 py-6">
        <SectionHeader
          eyebrow="Workflow"
          title={title}
          description="Suggested reading order for moving from broad exploration to record-level inspection."
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="surface-muted space-y-3 px-5 py-5">
              <Badge variant="subtle">Step {index + 1}</Badge>
              <p className="text-sm leading-6 text-slate-600">{step}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
