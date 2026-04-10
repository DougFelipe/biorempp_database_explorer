import { useMemo } from 'react';
import type { GuidedScatterPoint } from '../../types/guided';

interface RiskPotentialScatterChartProps {
  points: GuidedScatterPoint[];
  xThreshold: number;
  yThreshold: number;
  xScaleMode?: 'log10p1' | 'linear';
  yMetricLabel?: string;
  onSelectCompound: (cpd: string) => void;
}

const WIDTH = 980;
const HEIGHT = 560;
const MARGIN = { top: 36, right: 36, bottom: 72, left: 72 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

const PALETTE = [
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

function xScale(value: number, max: number) {
  const safeMax = Math.max(1, max);
  return MARGIN.left + (value / safeMax) * PLOT_WIDTH;
}

function toXDomainValue(rawValue: number, mode: 'log10p1' | 'linear') {
  if (mode === 'log10p1') {
    return Math.log10(Math.max(0, rawValue) + 1);
  }
  return rawValue;
}

function yScale(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return MARGIN.top + (1 - clamped) * PLOT_HEIGHT;
}

function radiusScale(value: number, min: number, max: number) {
  const minRadius = 4;
  const maxRadius = 11;
  const safeSpan = Math.max(1e-9, max - min);
  const normalized = Math.max(0, Math.min(1, (value - min) / safeSpan));
  return minRadius + Math.sqrt(normalized) * (maxRadius - minRadius);
}

export function RiskPotentialScatterChart({
  points,
  xThreshold,
  yThreshold,
  xScaleMode = 'linear',
  yMetricLabel = 'toxicity_risk_mean',
  onSelectCompound,
}: RiskPotentialScatterChartProps) {
  const classList = useMemo(
    () =>
      [...new Set(points.map((point) => point.compoundclass || 'Unclassified'))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [points]
  );

  const classColorMap = useMemo(() => {
    const map = new Map<string, string>();
    classList.forEach((item, idx) => {
      map.set(item, PALETTE[idx % PALETTE.length]);
    });
    return map;
  }, [classList]);

  const xMaxRaw = useMemo(
    () => Math.max(xThreshold, ...points.map((point) => point.gene_count), 1),
    [points, xThreshold]
  );
  const xMax = useMemo(() => toXDomainValue(xMaxRaw, xScaleMode), [xMaxRaw, xScaleMode]);
  const pathwayMin = useMemo(
    () => Math.min(...points.map((point) => point.pathway_count), 0),
    [points]
  );
  const pathwayMax = useMemo(
    () => Math.max(...points.map((point) => point.pathway_count), 1),
    [points]
  );

  const xTicks = useMemo(() => {
    if (xScaleMode === 'linear') {
      const tickCount = 6;
      return Array.from({ length: tickCount + 1 }, (_, idx) => Math.round((idx / tickCount) * xMaxRaw));
    }

    const candidates = [0, 1, 2, 5, 10, 20, 50, 100, 200, 300, 500, 1000];
    const values = candidates.filter((value) => value <= xMaxRaw);
    values.push(Math.round(xThreshold));
    values.push(Math.round(xMaxRaw));
    return [...new Set(values.filter((value) => value >= 0))].sort((a, b) => a - b);
  }, [xMaxRaw, xScaleMode, xThreshold]);

  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1];

  if (points.length === 0) {
    return <p className="text-sm text-gray-500">No compounds with toxicity risk available for scatter plot.</p>;
  }

  const thresholdX = xScale(toXDomainValue(xThreshold, xScaleMode), xMax);
  const thresholdY = yScale(yThreshold);

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto rounded border border-gray-100 bg-white">
        <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_WIDTH} height={PLOT_HEIGHT} fill="#ffffff" />

        <line
          x1={MARGIN.left}
          y1={MARGIN.top + PLOT_HEIGHT}
          x2={MARGIN.left + PLOT_WIDTH}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke="#94a3b8"
          strokeWidth="1"
        />
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke="#94a3b8"
          strokeWidth="1"
        />

        {xTicks.map((tick) => {
          const x = xScale(toXDomainValue(tick, xScaleMode), xMax);
          return (
            <g key={`x-${tick}`}>
              <line x1={x} y1={MARGIN.top + PLOT_HEIGHT} x2={x} y2={MARGIN.top + PLOT_HEIGHT + 5} stroke="#94a3b8" />
              <text x={x} y={MARGIN.top + PLOT_HEIGHT + 18} textAnchor="middle" className="fill-gray-500 text-[10px]">
                {tick}
              </text>
            </g>
          );
        })}

        {yTicks.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={`y-${tick}`}>
              <line x1={MARGIN.left - 5} y1={y} x2={MARGIN.left} y2={y} stroke="#94a3b8" />
              <text x={MARGIN.left - 10} y={y + 3} textAnchor="end" className="fill-gray-500 text-[10px]">
                {tick.toFixed(1)}
              </text>
            </g>
          );
        })}

        <line
          x1={thresholdX}
          y1={MARGIN.top}
          x2={thresholdX}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke="#dc2626"
          strokeDasharray="6 4"
          strokeWidth="1.5"
        />
        <line
          x1={MARGIN.left}
          y1={thresholdY}
          x2={MARGIN.left + PLOT_WIDTH}
          y2={thresholdY}
          stroke="#dc2626"
          strokeDasharray="6 4"
          strokeWidth="1.5"
        />

        <text x={MARGIN.left + 8} y={MARGIN.top + 14} className="fill-gray-500 text-[11px]">
          High Risk + Low Potential
        </text>
        <text x={thresholdX + 8} y={MARGIN.top + 14} className="fill-gray-500 text-[11px]">
          High Risk + High Potential
        </text>
        <text x={MARGIN.left + 8} y={MARGIN.top + PLOT_HEIGHT - 8} className="fill-gray-500 text-[11px]">
          Low Risk + Low Potential
        </text>
        <text x={thresholdX + 8} y={MARGIN.top + PLOT_HEIGHT - 8} className="fill-gray-500 text-[11px]">
          Low Risk + High Potential
        </text>

        {points.map((point) => {
          const cx = xScale(toXDomainValue(point.gene_count, xScaleMode), xMax);
          const cy = yScale(point.y_value);
          const radius = radiusScale(point.pathway_count, pathwayMin, pathwayMax);
          const classKey = point.compoundclass || 'Unclassified';
          const color = classColorMap.get(classKey) || '#64748b';

          return (
            <circle
              key={point.cpd}
              cx={cx}
              cy={cy}
              r={radius}
              fill={color}
              fillOpacity={0.75}
              stroke="#1f2937"
              strokeOpacity={0.25}
              strokeWidth={0.75}
              className="cursor-pointer"
              onClick={() => onSelectCompound(point.cpd)}
            >
              <title>
                {`${point.compoundname || point.cpd} (${point.cpd}) | class=${
                  point.compoundclass || 'Unclassified'
                } | gene_count=${point.gene_count} | ${yMetricLabel}=${point.y_value.toFixed(
                  3
                )} | pathway_count=${point.pathway_count}`}
              </title>
            </circle>
          );
        })}

        <text
          x={MARGIN.left + PLOT_WIDTH / 2}
          y={HEIGHT - 18}
          textAnchor="middle"
          className="fill-gray-700 text-[12px] font-medium"
        >
          {xScaleMode === 'log10p1'
            ? 'Bioremediation Potential (log10(gene_count + 1))'
            : 'Bioremediation Potential (gene_count)'}
        </text>
        <text
          transform={`translate(18 ${MARGIN.top + PLOT_HEIGHT / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-gray-700 text-[12px] font-medium"
        >
          {yMetricLabel}
        </text>
      </svg>

      <div className="flex flex-wrap gap-3">
        {classList.map((compoundClass) => (
          <div key={compoundClass} className="flex items-center gap-2 text-xs text-gray-700">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: classColorMap.get(compoundClass) || '#64748b' }}
            />
            <span>{compoundClass}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
