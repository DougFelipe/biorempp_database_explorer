import type {
  KoBarDatum,
  PathwayCoverageMatrix,
  PathwayTopDatum,
  ToxicityRiskBucket,
} from '../types/database';
import type { HeatmapCell } from '../components/charts/CategoricalHeatmap';
import type { HorizontalBarItem } from '../components/charts/HorizontalBarChart';

export function toKoBarItems(rows: KoBarDatum[]): HorizontalBarItem[] {
  return rows.map((row) => ({
    id: row.ko,
    label: row.ko,
    value: row.count,
    tooltip: `${row.ko}: ${row.count} distinct KO-Pathway relations (HADEG=${row.relation_count_hadeg}, KEGG=${row.relation_count_kegg})`,
    color: '#2563eb',
  }));
}

export function toPathwayTopItems(rows: PathwayTopDatum[]): HorizontalBarItem[] {
  return rows.map((row) => ({
    id: `${row.source}|${row.pathway}`,
    label: row.pathway,
    value: row.supporting_rows,
    tooltip: `${row.pathway} [${row.source}] - ${row.supporting_rows} distinct KO-Pathway relations`,
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
      tooltip: `${cell.source} x ${cell.pathway}: ${
        cell.present ? `${cell.weight} distinct KO-Pathway relations` : 'not present'
      }`,
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
