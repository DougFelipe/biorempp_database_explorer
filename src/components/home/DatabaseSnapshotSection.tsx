import { Database } from 'lucide-react';
import { DATABASE_METRICS_CATALOG } from '../../config/databaseMetricsCatalog';
import { Button, Card, CardContent, MetricCard, SectionHeader } from '../../shared/ui';
import type { ReactNode } from 'react';

interface DatabaseSnapshotSectionProps {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actionLabel?: ReactNode;
  onOpenDatabaseMetrics: () => void;
}

export function DatabaseSnapshotSection({
  eyebrow = 'Snapshot',
  title = 'Database Snapshot (v1.1.0 metrics)',
  description = 'Quick metric baseline for the current BioRemPP release, aligned with the full metrics documentation.',
  actionLabel = 'View full database metrics',
  onOpenDatabaseMetrics,
}: DatabaseSnapshotSectionProps) {
  return (
    <Card>
      <CardContent className="space-y-6 px-6 py-6">
        <SectionHeader
          eyebrow={eyebrow}
          title={
            <span className="inline-flex items-center gap-2">
              <Database className="h-5 w-5 text-accent" />
              {title}
            </span>
          }
          description={description}
          action={
            <Button variant="outline" onClick={onOpenDatabaseMetrics}>
              {actionLabel}
            </Button>
          }
        />

        <div className="surface-muted px-4 py-3 text-xs leading-5 text-slate-500">
          <p>{DATABASE_METRICS_CATALOG.metrics_source_label}</p>
          <p>{DATABASE_METRICS_CATALOG.schema_reference_label}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {DATABASE_METRICS_CATALOG.core_metrics.map((metric) => (
            <MetricCard key={metric.id} label={metric.label} value={metric.value} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {DATABASE_METRICS_CATALOG.highlight_metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
              valueClassName="text-lg"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
