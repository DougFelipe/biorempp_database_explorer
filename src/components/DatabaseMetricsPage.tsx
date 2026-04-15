import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import {
  DATABASE_METRICS_CATALOG,
  formatCompleteness,
  getCompletenessBadgeColor,
} from '../config/databaseMetricsCatalog';

interface DatabaseMetricsPageProps {
  onBack: () => void;
}

function NumberedList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  return (
    <article className="rounded-lg border border-gray-200 p-4 bg-white">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-1 last:border-b-0">
            <span className="truncate">{item.name}</span>
            <span className="font-medium text-gray-900">{item.count.toLocaleString('en-US')}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function DatabaseMetricsPage({ onBack }: DatabaseMetricsPageProps) {
  const rowShapes = DATABASE_METRICS_CATALOG.row_shapes;
  const reactionCoverage = DATABASE_METRICS_CATALOG.reaction_coverage;

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Database Metrics</h2>
              <p className="text-sm text-gray-600">
                {DATABASE_METRICS_CATALOG.database_name} {DATABASE_METRICS_CATALOG.database_version} metrics overview
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 space-y-0.5">
          <p>{DATABASE_METRICS_CATALOG.metrics_source_label}</p>
          <p>{DATABASE_METRICS_CATALOG.schema_reference_label}</p>
          <p>Generated: {DATABASE_METRICS_CATALOG.generation_date}</p>
        </div>

        <div className="p-6 space-y-6">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Core Profile</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
              {DATABASE_METRICS_CATALOG.core_metrics.map((metric) => (
                <article key={metric.id} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">{metric.label}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{metric.value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Coverage & Highlights</h3>
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

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Data Quality (BioRemPP v1.1.0 metrics)</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completeness</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Missing values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DATABASE_METRICS_CATALOG.column_completeness.map((item) => (
                    <tr key={item.column}>
                      <td className="px-3 py-2 text-gray-900">{item.column}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getCompletenessBadgeColor(item.completeness_pct)}`}>
                          {formatCompleteness(item.completeness_pct)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{item.missing_count.toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
              <article className="rounded-lg border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Row Shapes</p>
                <p className="text-sm text-gray-700 mt-1">Dense: {rowShapes.dense.toLocaleString('en-US')}</p>
                <p className="text-sm text-gray-700">EC-only: {rowShapes.ec_only.toLocaleString('en-US')}</p>
                <p className="text-sm text-gray-700">Reaction-only: {rowShapes.reaction_only.toLocaleString('en-US')}</p>
                <p className="text-sm text-gray-700">Both NA: {rowShapes.both_na.toLocaleString('en-US')}</p>
              </article>
              <article className="rounded-lg border border-gray-200 p-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Reaction Description Coverage</p>
                <p className="text-sm text-gray-700 mt-1">
                  with reaction: {reactionCoverage.with_reaction_rows.toLocaleString('en-US')}
                </p>
                <p className="text-sm text-gray-700">
                  with description: {reactionCoverage.with_reaction_description_rows.toLocaleString('en-US')}
                </p>
                <p className="text-sm text-gray-700">
                  unmatched reaction IDs: {reactionCoverage.unmatched_reaction_id_count.toLocaleString('en-US')}
                </p>
              </article>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Top Distributions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <NumberedList title="Top Compound Classes" items={DATABASE_METRICS_CATALOG.top_compound_classes} />
              <NumberedList title="Top Regulatory Agencies" items={DATABASE_METRICS_CATALOG.top_agencies} />
              <NumberedList title="Top Gene Symbols" items={DATABASE_METRICS_CATALOG.top_genes} />
              <NumberedList title="Top KO IDs" items={DATABASE_METRICS_CATALOG.top_kos} />
              <NumberedList title="Top Enzyme Activities" items={DATABASE_METRICS_CATALOG.top_enzymes} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Schema Snapshots (documentation reference)</h3>
            <p className="text-sm text-gray-600">
              Summaries below were derived from individual schema docs: biorempp-schema.md, hadeg-schema.md, kegg-schema.md, and toxcsm-schema.md.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DATABASE_METRICS_CATALOG.schemas.map((schema) => (
                <article key={schema.id} className="rounded-lg border border-gray-200 p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">{schema.database}</h4>
                      <p className="text-xs text-gray-500 mt-1">{schema.version}</p>
                    </div>
                    <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <p className="text-gray-500">Rows</p>
                    <p className="text-gray-900 font-medium">{schema.rows.toLocaleString('en-US')}</p>
                    <p className="text-gray-500">Columns</p>
                    <p className="text-gray-900 font-medium">{schema.columns}</p>
                    <p className="text-gray-500">Join key</p>
                    <p className="text-gray-900 font-medium">{schema.join_key}</p>
                  </div>
                  <p className="mt-3 text-sm text-gray-700">{schema.focus}</p>
                  <p className="mt-2 text-xs text-gray-500">Doc: {schema.source_doc}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {schema.core_columns.map((column) => (
                      <span key={column} className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                        {column}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
