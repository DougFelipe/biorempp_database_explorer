import type { GuidedScatterPoint } from '@/features/guided-analysis/types';
import type { ChartLegendItem } from '@/shared/visualization';

const SCATTER_PALETTE = [
  '#2563eb',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#64748b',
  '#0ea5e9',
];

export function getScatterClassList(points: GuidedScatterPoint[]): string[] {
  return [...new Set(points.map((point) => point.compoundclass || 'Unclassified'))].sort(
    (a, b) => a.localeCompare(b)
  );
}

export function createScatterClassColorMap(
  classList: string[]
): Map<string, string> {
  const map = new Map<string, string>();

  classList.forEach((compoundClass, index) => {
    map.set(compoundClass, SCATTER_PALETTE[index % SCATTER_PALETTE.length]);
  });

  return map;
}

export function createScatterLegendItems(
  classList: string[],
  classColorMap: Map<string, string>
): ChartLegendItem[] {
  return classList.map((compoundClass) => ({
    label: compoundClass,
    color: classColorMap.get(compoundClass) || '#64748b',
  }));
}
