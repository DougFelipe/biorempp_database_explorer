import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 min-w-0 overflow-hidden">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
