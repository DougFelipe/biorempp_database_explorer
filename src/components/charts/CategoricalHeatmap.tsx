import { ChartTooltip, VisualizationEmptyState } from '@/shared/visualization';

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  tooltip?: string;
  colorKey?: string;
  displayValue?: string;
}

interface CategoricalHeatmapProps {
  xLabels: string[];
  yLabels: string[];
  cells: HeatmapCell[];
  emptyMessage: string;
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
  getCellColor?: (cell: HeatmapCell, normalizedValue: number) => string;
}

function defaultCellColor(_cell: HeatmapCell, normalizedValue: number) {
  const clamped = Math.max(0, Math.min(1, normalizedValue));
  const lightness = 96 - clamped * 42;
  return `hsl(214, 82%, ${lightness}%)`;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function CategoricalHeatmap({
  xLabels,
  yLabels,
  cells,
  emptyMessage,
  showValues = false,
  valueFormatter = (value) => value.toFixed(2),
  getCellColor = defaultCellColor,
}: CategoricalHeatmapProps) {
  if (xLabels.length === 0 || yLabels.length === 0 || cells.length === 0) {
    return <VisualizationEmptyState message={emptyMessage} />;
  }

  const min = Math.min(...cells.map((cell) => cell.value));
  const max = Math.max(...cells.map((cell) => cell.value));
  const span = Math.max(1e-9, max - min);

  const cellMap = new Map(cells.map((cell) => [`${cell.y}|${cell.x}`, cell]));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-left text-[11px] text-gray-500 font-medium pr-2"></th>
            {xLabels.map((label) => (
              <th key={label} className="text-[10px] text-gray-500 font-medium text-left min-w-[72px]">
                <span className="block truncate" title={label}>
                  {label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yLabels.map((yLabel) => (
            <tr key={yLabel}>
              <th className="text-[11px] text-gray-700 font-medium text-left pr-2 align-middle whitespace-nowrap">
                <span className="block truncate max-w-[120px]" title={yLabel}>
                  {yLabel}
                </span>
              </th>
              {xLabels.map((xLabel) => {
                const cell = cellMap.get(`${yLabel}|${xLabel}`) || {
                  x: xLabel,
                  y: yLabel,
                  value: 0,
                };
                const normalized = clamp01((cell.value - min) / span);
                const color = getCellColor(cell, normalized);
                return (
                  <td key={`${yLabel}|${xLabel}`} className="p-0">
                    <ChartTooltip
                      content={cell.tooltip || `${yLabel} x ${xLabel}: ${valueFormatter(cell.value)}`}
                      className="h-7 rounded border border-gray-100 text-[10px] text-gray-800 px-1 flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      {showValues ? cell.displayValue || valueFormatter(cell.value) : null}
                    </ChartTooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
