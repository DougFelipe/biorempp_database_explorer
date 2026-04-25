import {
  SCATTER_MARGIN,
  SCATTER_PLOT_HEIGHT,
  SCATTER_PLOT_WIDTH,
} from '@/features/guided-analysis/charts/scatterDimensions';

interface ScatterThresholdOverlayProps {
  thresholdX: number;
  thresholdY: number;
}

export function ScatterThresholdOverlay({
  thresholdX,
  thresholdY,
}: ScatterThresholdOverlayProps) {
  return (
    <>
      <line
        data-testid="scatter-threshold-x"
        x1={thresholdX}
        y1={SCATTER_MARGIN.top}
        x2={thresholdX}
        y2={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT}
        stroke="#dc2626"
        strokeDasharray="6 4"
        strokeWidth="1.5"
      />
      <line
        data-testid="scatter-threshold-y"
        x1={SCATTER_MARGIN.left}
        y1={thresholdY}
        x2={SCATTER_MARGIN.left + SCATTER_PLOT_WIDTH}
        y2={thresholdY}
        stroke="#dc2626"
        strokeDasharray="6 4"
        strokeWidth="1.5"
      />

      <text x={SCATTER_MARGIN.left + 8} y={SCATTER_MARGIN.top + 14} className="fill-gray-500 text-[11px]">
        High Risk + Low Potential
      </text>
      <text x={thresholdX + 8} y={SCATTER_MARGIN.top + 14} className="fill-gray-500 text-[11px]">
        High Risk + High Potential
      </text>
      <text
        x={SCATTER_MARGIN.left + 8}
        y={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT - 8}
        className="fill-gray-500 text-[11px]"
      >
        Low Risk + Low Potential
      </text>
      <text
        x={thresholdX + 8}
        y={SCATTER_MARGIN.top + SCATTER_PLOT_HEIGHT - 8}
        className="fill-gray-500 text-[11px]"
      >
        Low Risk + High Potential
      </text>
    </>
  );
}
