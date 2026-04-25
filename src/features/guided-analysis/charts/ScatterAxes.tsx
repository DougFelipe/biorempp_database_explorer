import type { ScatterScaleMode } from '@/features/guided-analysis/charts/scatterScaleUtils';
import {
  SCATTER_HEIGHT,
  SCATTER_MARGIN,
  SCATTER_PLOT_HEIGHT,
  SCATTER_PLOT_WIDTH,
} from '@/features/guided-analysis/charts/scatterDimensions';
import {
  SCATTER_Y_TICKS,
  toScatterXDomainValue,
  toScatterXPosition,
  toScatterYPosition,
} from '@/features/guided-analysis/charts/scatterScaleUtils';

interface ScatterAxesProps {
  xTicks: number[];
  xMax: number;
  xScaleMode: ScatterScaleMode;
  yMetricLabel: string;
}

export function ScatterAxes({
  xTicks,
  xMax,
  xScaleMode,
  yMetricLabel,
}: ScatterAxesProps) {
  return (
    <>
      <line
        x1={SCATTER_MARGIN.left}
        y1={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT}
        x2={SCATTER_MARGIN.left + SCATTER_PLOT_WIDTH}
        y2={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT}
        stroke="#94a3b8"
        strokeWidth="1"
      />
      <line
        x1={SCATTER_MARGIN.left}
        y1={SCATTER_MARGIN.top}
        x2={SCATTER_MARGIN.left}
        y2={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT}
        stroke="#94a3b8"
        strokeWidth="1"
      />

      {xTicks.map((tick) => {
        const x = toScatterXPosition(toScatterXDomainValue(tick, xScaleMode), xMax);

        return (
          <g key={`x-${tick}`}>
            <line
              x1={x}
              y1={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT}
              x2={x}
              y2={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT + 5}
              stroke="#94a3b8"
            />
            <text
              x={x}
              y={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT + 18}
              textAnchor="middle"
              className="fill-gray-500 text-[10px]"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {SCATTER_Y_TICKS.map((tick) => {
        const y = toScatterYPosition(tick);

        return (
          <g key={`y-${tick}`}>
            <line
              x1={SCATTER_MARGIN.left - 5}
              y1={y}
              x2={SCATTER_MARGIN.left}
              y2={y}
              stroke="#94a3b8"
            />
            <text
              x={SCATTER_MARGIN.left - 10}
              y={y + 3}
              textAnchor="end"
              className="fill-gray-500 text-[10px]"
            >
              {tick.toFixed(1)}
            </text>
          </g>
        );
      })}

      <text
        x={SCATTER_MARGIN.left + SCATTER_PLOT_WIDTH / 2}
        y={SCATTER_HEIGHT - 18}
        textAnchor="middle"
        className="fill-gray-700 text-[12px] font-medium"
      >
        {xScaleMode === 'log10p1'
          ? 'Bioremediation Potential (log10(gene_count + 1))'
          : 'Bioremediation Potential (gene_count)'}
      </text>
      <text
        transform={`translate(18 ${SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT / 2}) rotate(-90)`}
        textAnchor="middle"
        className="fill-gray-700 text-[12px] font-medium"
      >
        {yMetricLabel}
      </text>
    </>
  );
}
