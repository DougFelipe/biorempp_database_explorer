import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import {
  DATABASE_METRICS_CATALOG,
  formatCompleteness,
  getCompletenessBadgeColor,
} from '../config/databaseMetricsCatalog';
import {
  Badge,
  Button,
  Card,
  CardContent,
  MetricCard,
  SectionHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../shared/ui';

interface DatabaseMetricsPageProps {
  onBack: () => void;
}

function NumberedList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 px-4 py-4">
        <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
        <ul className="space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1 last:border-b-0">
              <span className="truncate">{item.name}</span>
              <span className="font-medium text-slate-950">{item.count.toLocaleString('en-US')}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function DatabaseMetricsPage({ onBack }: DatabaseMetricsPageProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow="Documentation"
            title="Database Metrics"
            description={`${DATABASE_METRICS_CATALOG.database_name} ${DATABASE_METRICS_CATALOG.database_version} metrics overview`}
            action={
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            }
          />

          <div className="surface-muted px-4 py-3 text-xs leading-5 text-slate-500">
            <p>{DATABASE_METRICS_CATALOG.metrics_source_label}</p>
            <p>{DATABASE_METRICS_CATALOG.schema_reference_label}</p>
            <p>Generated: {DATABASE_METRICS_CATALOG.generation_date}</p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950">Core Profile</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {DATABASE_METRICS_CATALOG.core_metrics.map((metric) => (
            <MetricCard key={metric.id} label={metric.label} value={metric.value} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950">Coverage & Highlights</h3>
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
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950">Data Quality (BioRemPP v1.1.0 metrics)</h3>
        <Card>
          <CardContent className="px-0 py-0">
            <Table>
              <TableHeader className="bg-slate-50/90">
                <TableRow>
                  <TableHead className="pl-6">Column</TableHead>
                  <TableHead>Completeness</TableHead>
                  <TableHead className="pr-6">Missing values</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DATABASE_METRICS_CATALOG.column_completeness.map((item) => (
                  <TableRow key={item.column}>
                    <TableCell className="pl-6 font-medium text-slate-900">{item.column}</TableCell>
                    <TableCell>
                      <Badge className={getCompletenessBadgeColor(item.completeness_pct)}>
                        {formatCompleteness(item.completeness_pct)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6">{item.missing_count.toLocaleString('en-US')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-950">Top Distributions</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <NumberedList title="Top Compound Classes" items={DATABASE_METRICS_CATALOG.top_compound_classes} />
          <NumberedList title="Top Regulatory Agencies" items={DATABASE_METRICS_CATALOG.top_agencies} />
          <NumberedList title="Top Gene Symbols" items={DATABASE_METRICS_CATALOG.top_genes} />
          <NumberedList title="Top KO IDs" items={DATABASE_METRICS_CATALOG.top_kos} />
          <NumberedList title="Top Enzyme Activities" items={DATABASE_METRICS_CATALOG.top_enzymes} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-950">Schema Snapshots (documentation reference)</h3>
          <p className="text-sm leading-6 text-slate-600">
            Summaries below were derived from individual schema docs: biorempp-schema.md, hadeg-schema.md,
            kegg-schema.md, and toxcsm-schema.md.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {DATABASE_METRICS_CATALOG.schemas.map((schema) => (
            <Card key={schema.id} className="rounded-2xl shadow-soft">
              <CardContent className="space-y-4 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-950">{schema.database}</h4>
                    <p className="text-xs text-slate-500">{schema.version}</p>
                  </div>
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-slate-500">Rows</p>
                  <p className="font-medium text-slate-950">{schema.rows.toLocaleString('en-US')}</p>
                  <p className="text-slate-500">Columns</p>
                  <p className="font-medium text-slate-950">{schema.columns}</p>
                  <p className="text-slate-500">Join key</p>
                  <p className="font-medium text-slate-950">{schema.join_key}</p>
                </div>

                <p className="text-sm leading-6 text-slate-700">{schema.focus}</p>
                <p className="text-xs text-slate-500">Doc: {schema.source_doc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {schema.core_columns.map((column) => (
                    <Badge key={column} variant="secondary">
                      {column}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
