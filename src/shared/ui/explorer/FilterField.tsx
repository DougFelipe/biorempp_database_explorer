import type { ReactNode } from 'react';

interface FilterFieldProps {
  children: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
}

export function FilterField({ children, hint, label }: FilterFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
