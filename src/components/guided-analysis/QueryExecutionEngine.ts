import type { CompoundSummary } from '../../types/database';
import type { GuidedQueryDefinition } from './guidedQueries';
import type { HorizontalBarItem } from '../charts/HorizontalBarChart';

export type QuadrantId = 'top_right' | 'top_left' | 'bottom_right' | 'bottom_left';

export interface QuadrantCounts {
  top_right: number;
  top_left: number;
  bottom_right: number;
  bottom_left: number;
}

export interface GuidedUc3Point {
  cpd: string;
  compoundname: string | null;
  compoundclass: string | null;
  gene_count: number;
  ko_count: number;
  toxicity_risk_mean: number;
  y_value: number;
  pathway_count: number;
  quadrant: QuadrantId;
}

export interface GuidedUc3Result {
  compoundsInScope: number;
  points: GuidedUc3Point[];
  excludedNullToxicityCount: number;
  quadrantCounts: QuadrantCounts;
  topRightCompounds: GuidedUc3Point[];
  page: number;
  pageSize: number;
  totalPages: number;
  topRightPageRows: GuidedUc3Point[];
  startRank: number;
  xThreshold: number;
  yThreshold: number;
  yMetricKey: string;
  yMetricLabel: string;
}

export interface GuidedUc1Result {
  compoundsInScope: number;
  rankingRows: CompoundSummary[];
  rankingRowsPage: CompoundSummary[];
  barItems: HorizontalBarItem[];
  page: number;
  pageSize: number;
  totalPages: number;
  startRank: number;
}

export function executeUc1(
  query: GuidedQueryDefinition,
  compounds: CompoundSummary[],
  options: { page?: number; pageSize?: number } = {}
): GuidedUc1Result {
  const pageSize = Math.max(1, options.pageSize ?? 10);

  const rankingRows = [...compounds].sort((a, b) => {
    const delta = b.ko_count - a.ko_count;
    if (delta !== 0) {
      return delta;
    }
    return a.cpd.localeCompare(b.cpd);
  });

  const totalPages = Math.max(1, Math.ceil(rankingRows.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, options.page ?? 1));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const rankingRowsPage = rankingRows.slice(start, end);

  const barItems = rankingRowsPage.map((compound) => ({
    id: compound.cpd,
    label: compound.compoundname || compound.cpd,
    value: compound.ko_count,
    tooltip: `${compound.cpd} - ${query.metric}: ${compound.ko_count}`,
    color: '#2563eb',
  }));

  return {
    compoundsInScope: compounds.length,
    rankingRows,
    rankingRowsPage,
    barItems,
    page,
    pageSize,
    totalPages,
    startRank: start,
  };
}

function quadrantFor(point: { gene_count: number; toxicity_risk_mean: number }, xThreshold: number, yThreshold: number): QuadrantId {
  const highPotential = point.gene_count >= xThreshold;
  const highRisk = point.toxicity_risk_mean >= yThreshold;

  if (highPotential && highRisk) {
    return 'top_right';
  }
  if (!highPotential && highRisk) {
    return 'top_left';
  }
  if (highPotential && !highRisk) {
    return 'bottom_right';
  }
  return 'bottom_left';
}

export function executeUc3(
  _query: GuidedQueryDefinition,
  compounds: CompoundSummary[],
  options: { page?: number; pageSize?: number; xThreshold?: number; yThreshold?: number; endpoint?: string | null } = {}
): GuidedUc3Result {
  const pageSize = Math.max(1, options.pageSize ?? 10);
  const xThreshold = options.xThreshold ?? 200;
  const yThreshold = options.yThreshold ?? 0.5;
  const endpoint = options.endpoint?.trim() || null;
  const yMetricKey = endpoint || 'toxicity_risk_mean';
  const yMetricLabel = endpoint || 'toxicity_risk_mean';

  const points = compounds
    .map((compound) => {
      const endpointValue = endpoint ? compound.toxicity_scores?.[endpoint] ?? null : compound.toxicity_risk_mean;
      const baselineRiskMean = compound.toxicity_risk_mean ?? endpointValue;

      if (endpointValue === null || endpointValue === undefined || baselineRiskMean === null || baselineRiskMean === undefined) {
        return null;
      }

      const yValue = Number(endpointValue);
      if (Number.isNaN(yValue)) {
        return null;
      }

      const toxicityRiskMean = Number(baselineRiskMean);
      if (Number.isNaN(toxicityRiskMean)) {
        return null;
      }

      const quadrant = quadrantFor(
        { gene_count: compound.gene_count, toxicity_risk_mean: yValue },
        xThreshold,
        yThreshold
      );

      return {
        cpd: compound.cpd,
        compoundname: compound.compoundname,
        compoundclass: compound.compoundclass,
        gene_count: compound.gene_count,
        ko_count: compound.ko_count,
        toxicity_risk_mean: toxicityRiskMean,
        y_value: yValue,
        pathway_count: compound.pathway_count,
        quadrant,
      };
    })
    .filter((point): point is GuidedUc3Point => point !== null);

  const excludedNullToxicityCount = compounds.length - points.length;

  const quadrantCounts: QuadrantCounts = {
    top_right: 0,
    top_left: 0,
    bottom_right: 0,
    bottom_left: 0,
  };

  for (const point of points) {
    quadrantCounts[point.quadrant] += 1;
  }

  const topRightCompounds = points
    .filter((point) => point.quadrant === 'top_right')
    .sort((a, b) => {
      const riskDelta = b.y_value - a.y_value;
      if (riskDelta !== 0) {
        return riskDelta;
      }
      const potentialDelta = b.gene_count - a.gene_count;
      if (potentialDelta !== 0) {
        return potentialDelta;
      }
      return a.cpd.localeCompare(b.cpd);
    });

  const totalPages = Math.max(1, Math.ceil(topRightCompounds.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, options.page ?? 1));
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const topRightPageRows = topRightCompounds.slice(start, end);

  return {
    compoundsInScope: compounds.length,
    points,
    excludedNullToxicityCount,
    quadrantCounts,
    topRightCompounds,
    page,
    pageSize,
    totalPages,
    topRightPageRows,
    startRank: start,
    xThreshold,
    yThreshold,
    yMetricKey,
    yMetricLabel,
  };
}
