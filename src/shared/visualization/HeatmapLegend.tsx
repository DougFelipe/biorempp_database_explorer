import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { ChartLegend, type ChartLegendItem } from '@/shared/visualization/ChartLegend';

interface HeatmapLegendProps {
  discreteItems?: ChartLegendItem[];
  scaleLabel?: string;
  lowLabel?: string;
  highLabel?: string;
  gradient?: string;
  footer?: ReactNode;
  className?: string;
}

const DEFAULT_GRADIENT =
  'linear-gradient(90deg, hsl(130,78%,86%), hsl(24,78%,56%))';

export function HeatmapLegend({
  discreteItems = [],
  scaleLabel,
  lowLabel = 'Low',
  highLabel = 'High',
  gradient = DEFAULT_GRADIENT,
  footer,
  className,
}: HeatmapLegendProps) {
  return (
    <div
      className={cn(
        'space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3',
        className
      )}
    >
      {discreteItems.length > 0 || scaleLabel ? (
        <div className="flex items-center justify-between gap-3">
          <ChartLegend items={discreteItems} />
          {scaleLabel ? (
            <div className="text-[11px] whitespace-nowrap text-slate-600">
              {scaleLabel}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-slate-600">
        <span>{lowLabel}</span>
        <div
          className="h-2 flex-1 rounded border border-slate-200"
          style={{ background: gradient }}
        />
        <span>{highLabel}</span>
      </div>

      {footer ? <div className="text-xs text-slate-600">{footer}</div> : null}
    </div>
  );
}
