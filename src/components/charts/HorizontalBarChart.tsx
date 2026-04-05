export interface HorizontalBarItem {
  id: string;
  label: string;
  value: number;
  tooltip?: string;
  color?: string;
}

interface HorizontalBarChartProps {
  items: HorizontalBarItem[];
  emptyMessage: string;
  valueFormatter?: (value: number) => string;
}

export function HorizontalBarChart({
  items,
  emptyMessage,
  valueFormatter = (value) => String(value),
}: HorizontalBarChartProps) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const width = `${Math.max(2, (item.value / maxValue) * 100)}%`;
        return (
          <div key={item.id} className="space-y-1" title={item.tooltip}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-700 truncate">{item.label}</span>
              <span className="text-gray-900 font-medium">{valueFormatter(item.value)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded h-2">
              <div
                className="h-2 rounded"
                style={{ width, backgroundColor: item.color || '#2563eb' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
