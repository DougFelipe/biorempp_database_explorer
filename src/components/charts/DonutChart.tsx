export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  emptyMessage: string;
  centerLabel?: string;
}

const DEFAULT_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#a78bfa', '#94a3b8', '#ef4444', '#06b6d4', '#64748b'];

function toConicGradient(slices: DonutSlice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) {
    return 'conic-gradient(#e5e7eb 0deg 360deg)';
  }

  let cursor = 0;
  const parts: string[] = [];

  slices.forEach((slice, index) => {
    const ratio = slice.value / total;
    const start = cursor;
    cursor += ratio * 360;
    const color = slice.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    parts.push(`${color} ${start}deg ${cursor}deg`);
  });

  return `conic-gradient(${parts.join(', ')})`;
}

export function DonutChart({ slices, emptyMessage, centerLabel }: DonutChartProps) {
  const validSlices = slices.filter((slice) => slice.value > 0);
  if (validSlices.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  const total = validSlices.reduce((sum, slice) => sum + slice.value, 0);
  const gradient = toConicGradient(validSlices);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="relative h-40 w-40">
          <div
            className="h-full w-full rounded-full border border-gray-200"
            style={{ background: gradient }}
          />
          <div className="absolute inset-8 rounded-full bg-white border border-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{total}</div>
              {centerLabel ? <div className="text-[11px] text-gray-500">{centerLabel}</div> : null}
            </div>
          </div>
        </div>
      </div>

      <ul className="space-y-1.5">
        {validSlices.map((slice, index) => {
          const ratio = total === 0 ? 0 : (slice.value / total) * 100;
          const color = slice.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
          return (
            <li key={slice.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate text-gray-700" title={slice.label}>
                  {slice.label}
                </span>
              </div>
              <span className="text-gray-900 font-medium whitespace-nowrap">
                {slice.value} ({ratio.toFixed(0)}%)
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
