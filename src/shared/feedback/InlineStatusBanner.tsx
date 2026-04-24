import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type BannerTone = 'info' | 'success' | 'warning' | 'error';

const toneClassMap: Record<BannerTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
};

interface InlineStatusBannerProps {
  tone?: BannerTone;
  children: ReactNode;
  className?: string;
}

export function InlineStatusBanner({ tone = 'info', children, className }: InlineStatusBannerProps) {
  return (
    <div className={cn('rounded-2xl border px-4 py-3 text-sm leading-6', toneClassMap[tone], className)}>
      {children}
    </div>
  );
}
