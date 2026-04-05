import type {
  KoBarDatum,
  PathwayCoverageMatrix,
  PathwayTopDatum,
  ToxicityHeatmapDatum,
  ToxicityRiskBucket,
} from '../types/database';
import type { HeatmapCell } from '../components/charts/CategoricalHeatmap';
import type { HorizontalBarItem } from '../components/charts/HorizontalBarChart';
import { formatEndpoint } from './visualizationData';

export function toKoBarItems(rows: KoBarDatum[]): HorizontalBarItem[] {
  return rows.map((row) => ({
    id: row.ko,
    label: row.ko,
    value: row.count,
    tooltip: `${row.ko}: ${row.count}`,
    color: '#2563eb',
  }));
}

export function toPathwayTopItems(rows: PathwayTopDatum[]): HorizontalBarItem[] {
  return rows.map((row) => ({
    id: `${row.source}|${row.pathway}`,
    label: `${row.pathway} (${row.source})`,
    value: row.supporting_rows,
    tooltip: `${row.pathway} [${row.source}] - support: ${row.supporting_rows}`,
    color: row.source === 'HADEG' ? '#3b82f6' : row.source === 'KEGG' ? '#22c55e' : '#64748b',
  }));
}

export function toPathwayCoverageHeatmap(matrix: PathwayCoverageMatrix): {
  xLabels: string[];
  yLabels: string[];
  cells: HeatmapCell[];
} {
  return {
    xLabels: matrix.pathways,
    yLabels: matrix.sources,
    cells: matrix.cells.map((cell) => ({
      x: cell.pathway,
      y: cell.source,
      value: cell.weight,
      displayValue: cell.present ? String(cell.weight) : '',
      tooltip: `${cell.source} x ${cell.pathway}: ${cell.present ? `support=${cell.weight}` : 'not present'}`,
    })),
  };
}

export function riskBucketToScore(bucket: ToxicityRiskBucket) {
  if (bucket === 'high_risk') return 1;
  if (bucket === 'medium_risk') return 0.66;
  if (bucket === 'low_risk') return 0.33;
  return 0;
}

export function riskBucketLabel(bucket: ToxicityRiskBucket) {
  if (bucket === 'high_risk') return 'High Risk';
  if (bucket === 'medium_risk') return 'Medium Risk';
  if (bucket === 'low_risk') return 'Low Risk';
  return 'Unknown';
}

export function toToxicityHeatmapMatrix(rows: ToxicityHeatmapDatum[]): {
  xLabels: string[];
  yLabels: string[];
  cells: HeatmapCell[];
} {
  const xLabels = ['Prediction', 'Risk Bucket'];
  const yLabels = rows.map((row) => formatEndpoint(row.endpoint));
  const cells: HeatmapCell[] = [];

  for (const row of rows) {
    const endpoint = formatEndpoint(row.endpoint);
    cells.push({
      x: 'Prediction',
      y: endpoint,
      value: row.value ?? 0,
      displayValue: row.value === null ? '-' : row.value.toFixed(2),
      tooltip: `${endpoint}: value=${row.value === null ? '-' : row.value.toFixed(4)}`,
    });
    cells.push({
      x: 'Risk Bucket',
      y: endpoint,
      value: riskBucketToScore(row.risk_bucket),
      colorKey: row.risk_bucket,
      displayValue: riskBucketLabel(row.risk_bucket),
      tooltip: `${endpoint}: ${riskBucketLabel(row.risk_bucket)} (${row.label || 'no label'})`,
    });
  }

  return {
    xLabels,
    yLabels,
    cells,
  };
}
