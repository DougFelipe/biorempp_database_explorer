import { Database } from 'lucide-react';
import { DATABASE_METRICS_CATALOG } from '../../config/databaseMetricsCatalog';

interface DatabaseSnapshotSectionProps {
  onOpenDatabaseMetrics: () => void;
}

export function DatabaseSnapshotSection({ onOpenDatabaseMetrics }: DatabaseSnapshotSectionProps) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Database Snapshot (v1.1.0 metrics)</h3>
        </div>
        <button
          type="button"
          onClick={onOpenDatabaseMetrics}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          View full database metrics
        </button>
      </div>

      <div className="text-xs text-gray-500 space-y-0.5">
        <p>{DATABASE_METRICS_CATALOG.metrics_source_label}</p>
        <p>{DATABASE_METRICS_CATALOG.schema_reference_label}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {DATABASE_METRICS_CATALOG.core_metrics.map((metric) => (
          <article key={metric.id} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">{metric.label}</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{metric.value}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {DATABASE_METRICS_CATALOG.highlight_metrics.map((metric) => (
          <article key={metric.id} className="rounded-lg border border-gray-200 p-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">{metric.label}</p>
            <p className="text-base font-semibold text-gray-900 mt-1 break-words">{metric.value}</p>
            {metric.hint ? <p className="text-xs text-gray-500 mt-1">{metric.hint}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
