import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface MetadataPanelShellProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function MetadataPanelShell({
  title,
  description,
  children,
  className,
}: MetadataPanelShellProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {title || description ? (
        <div className="space-y-1">
          {title ? <h3 className="text-base font-semibold text-slate-950">{title}</h3> : null}
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
