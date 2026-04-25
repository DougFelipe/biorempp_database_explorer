import type { ReactNode } from 'react';
import { MetricCard } from '@/shared/ui/metric-card';
import { cn } from '@/shared/lib/cn';

export interface EntityStatItem {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
  span?: 1 | 2 | 3 | 'full';
}

interface EntityStatStripProps {
  items: EntityStatItem[];
  className?: string;
  gridClassName?: string;
}

function getSpanClass(span: EntityStatItem['span']) {
  switch (span) {
    case 2:
      return 'sm:col-span-2';
    case 3:
      return 'xl:col-span-3';
    case 'full':
      return 'sm:col-span-2 xl:col-span-full';
    default:
      return '';
  }
}

export function EntityStatStrip({ items, className, gridClassName }: EntityStatStripProps) {
  return (
    <div className={cn('bg-slate-50/80 px-6 py-5', className)}>
      <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4', gridClassName)}>
        {items.map((item) => (
          <MetricCard
            key={String(item.label)}
            label={item.label}
            value={item.value}
            hint={item.hint}
            className={cn('rounded-2xl border-slate-200 shadow-none', getSpanClass(item.span), item.className)}
            valueClassName={item.valueClassName}
          />
        ))}
      </div>
    </div>
  );
}
