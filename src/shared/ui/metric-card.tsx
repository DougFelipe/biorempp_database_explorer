import type { ReactNode } from 'react';
import { Card, CardContent } from './card';
import { cn } from '../lib/cn';

interface MetricCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
}

export function MetricCard({ label, value, hint, className, valueClassName }: MetricCardProps) {
  return (
    <Card className={cn('rounded-2xl shadow-soft', className)}>
      <CardContent className="space-y-1 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <p className={cn('text-2xl font-semibold tracking-tight text-slate-950', valueClassName)}>{value}</p>
        {hint ? <p className="text-xs leading-5 text-slate-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
