import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';

interface VisualizationCardShellProps {
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function VisualizationCardShell({
  title,
  subtitle,
  headerAction,
  children,
  className,
  contentClassName,
}: VisualizationCardShellProps) {
  return (
    <Card className={cn('min-w-0 overflow-hidden', className)}>
      <CardHeader className="gap-3 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-sm">{title}</CardTitle>
            {subtitle ? (
              <CardDescription className="text-xs text-slate-500">
                {subtitle}
              </CardDescription>
            ) : null}
          </div>
          {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-3 px-5 pb-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
