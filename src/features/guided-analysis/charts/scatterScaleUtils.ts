import type { GuidedScatterPoint } from '@/features/guided-analysis/types';
import {
  SCATTER_MARGIN,
  SCATTER_PLOT_HEIGHT,
  SCATTER_PLOT_WIDTH,
} from '@/features/guided-analysis/charts/scatterDimensions';

export type ScatterScaleMode = 'log10p1' | 'linear';

export const SCATTER_Y_TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1];

export function toScatterXDomainValue(
  rawValue: number,
  mode: ScatterScaleMode
): number {
  if (mode === 'log10p1') {
    return Math.log10(Math.max(0, rawValue) + 1);
  }

  return rawValue;
}

export function getScatterXMaxRaw(
  points: GuidedScatterPoint[],
  xThreshold: number
): number {
  return Math.max(xThreshold, ...points.map((point) => point.gene_count), 1);
}

export function getScatterPathwayRange(points: GuidedScatterPoint[]) {
  return {
    min: Math.min(...points.map((point) => point.pathway_count), 0),
    max: Math.max(...points.map((point) => point.pathway_count), 1),
  };
}

export function toScatterXPosition(value: number, maxDomainValue: number): number {
  const safeMax = Math.max(1, maxDomainValue);
  return SCATTER_MARGIN.left + (value / safeMax) * SCATTER_PLOT_WIDTH;
}

export function toScatterYPosition(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return SCATTER_MARGIN.top + (1 - clamped) * SCATTER_PLOT_HEIGHT;
}

export function toScatterRadius(
  pathwayCount: number,
  minPathwayCount: number,
  maxPathwayCount: number
): number {
  const minRadius = 4;
  const maxRadius = 11;
  const safeSpan = Math.max(1e-9, maxPathwayCount - minPathwayCount);
  const normalized = Math.max(
    0,
    Math.min(1, (pathwayCount - minPathwayCount) / safeSpan)
  );

  return minRadius + Math.sqrt(normalized) * (maxRadius - minRadius);
}

export function getScatterXTicks(
  xMaxRaw: number,
  xScaleMode: ScatterScaleMode,
  xThreshold: number
): number[] {
  if (xScaleMode === 'linear') {
    const tickCount = 6;
    return Array.from({ length: tickCount + 1 }, (_, index) =>
      Math.round((index / tickCount) * xMaxRaw)
    );
  }

  const candidates = [0, 1, 2, 5, 10, 20, 50, 100, 200, 300, 500, 1000];
  const values = candidates.filter((value) => value <= xMaxRaw);
  values.push(Math.round(xThreshold));
  values.push(Math.round(xMaxRaw));

  return [...new Set(values.filter((value) => value >= 0))].sort((a, b) => a - b);
}
