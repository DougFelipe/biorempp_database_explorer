import { useMemo } from 'react';
import {
  ScatterAxes,
} from '@/features/guided-analysis/charts/ScatterAxes';
import { ScatterPointRenderer } from '@/features/guided-analysis/charts/ScatterPointRenderer';
import { ScatterThresholdOverlay } from '@/features/guided-analysis/charts/ScatterThresholdOverlay';
import {
  SCATTER_HEIGHT,
  SCATTER_MARGIN,
  SCATTER_PLOT_HEIGHT,
  SCATTER_PLOT_WIDTH,
  SCATTER_WIDTH,
} from '@/features/guided-analysis/charts/scatterDimensions';
import {
  createScatterClassColorMap,
  createScatterLegendItems,
  getScatterClassList,
} from '@/features/guided-analysis/charts/scatterLegend';
import {
  getScatterPathwayRange,
  getScatterXMaxRaw,
  getScatterXTicks,
  toScatterRadius,
  toScatterXDomainValue,
  toScatterXPosition,
  toScatterYPosition,
} from '@/features/guided-analysis/charts/scatterScaleUtils';
import type { GuidedScatterPoint } from '@/features/guided-analysis/types';
import { ChartLegend, VisualizationEmptyState } from '@/shared/visualization';

interface RiskPotentialScatterChartProps {
  points: GuidedScatterPoint[];
  xThreshold: number;
  yThreshold: number;
  xScaleMode?: 'log10p1' | 'linear';
  yMetricLabel?: string;
  onSelectCompound: (cpd: string) => void;
}

export function RiskPotentialScatterChart({
  points,
  xThreshold,
  yThreshold,
  xScaleMode = 'linear',
  yMetricLabel = 'toxicity_risk_mean',
  onSelectCompound,
}: RiskPotentialScatterChartProps) {
  const classList = useMemo(() => getScatterClassList(points), [points]);

  const classColorMap = useMemo(() => {
    return createScatterClassColorMap(classList);
  }, [classList]);
  const legendItems = useMemo(
    () => createScatterLegendItems(classList, classColorMap),
    [classColorMap, classList]
  );

  const xMaxRaw = useMemo(
    () => getScatterXMaxRaw(points, xThreshold),
    [points, xThreshold]
  );
  const xMax = useMemo(
    () => toScatterXDomainValue(xMaxRaw, xScaleMode),
    [xMaxRaw, xScaleMode]
  );
  const pathwayRange = useMemo(() => getScatterPathwayRange(points), [points]);

  const xTicks = useMemo(() => {
    return getScatterXTicks(xMaxRaw, xScaleMode, xThreshold);
  }, [xMaxRaw, xScaleMode, xThreshold]);

  if (points.length === 0) {
    return (
      <VisualizationEmptyState message="No compounds with toxicity risk available for scatter plot." />
    );
  }

  const thresholdX = toScatterXPosition(
    toScatterXDomainValue(xThreshold, xScaleMode),
    xMax
  );
  const thresholdY = toScatterYPosition(yThreshold);

  return (
    <div className="space-y-3">
      <svg
        role="img"
        aria-label="Risk potential scatter chart"
        viewBox={`0 0 ${SCATTER_WIDTH} ${SCATTER_HEIGHT}`}
        className="w-full h-auto rounded border border-gray-100 bg-white"
      >
        <rect
          x={SCATTER_MARGIN.left}
          y={SCATTER_MARGIN.top}
          width={SCATTER_PLOT_WIDTH}
          height={SCATTER_PLOT_HEIGHT}
          fill="#ffffff"
        />

        <ScatterAxes
          xTicks={xTicks}
          xMax={xMax}
          xScaleMode={xScaleMode}
          yMetricLabel={yMetricLabel}
        />
        <ScatterThresholdOverlay thresholdX={thresholdX} thresholdY={thresholdY} />
        <ScatterPointRenderer
          points={points}
          yMetricLabel={yMetricLabel}
          classColorMap={classColorMap}
          getX={(point) =>
            toScatterXPosition(
              toScatterXDomainValue(point.gene_count, xScaleMode),
              xMax
            )
          }
          getY={(point) => toScatterYPosition(point.y_value)}
          getRadius={(point) =>
            toScatterRadius(
              point.pathway_count,
              pathwayRange.min,
              pathwayRange.max
            )
          }
          onSelectCompound={onSelectCompound}
        />
      </svg>

      <ChartLegend items={legendItems} />
    </div>
  );
}
