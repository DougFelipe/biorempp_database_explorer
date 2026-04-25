import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle } from '@/shared/ui';

interface GuidedAnalysisLayoutProps {
  title: string;
  description: string;
  sidebar: ReactNode;
  children: ReactNode;
}

export function GuidedAnalysisLayout({
  title,
  description,
  sidebar,
  children,
}: GuidedAnalysisLayoutProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-sm text-slate-600">{description}</p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0">{sidebar}</div>
        <div className="space-y-4 min-w-0">{children}</div>
      </div>
    </div>
  );
}
