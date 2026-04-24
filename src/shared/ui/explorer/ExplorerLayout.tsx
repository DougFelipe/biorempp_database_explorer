import type { ReactNode } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { SectionHeader } from '@/shared/ui/section-header';

interface ExplorerLayoutProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  filters?: ReactNode;
  title: ReactNode;
  toolbar?: ReactNode;
}

export function ExplorerLayout({
  actions,
  children,
  description,
  eyebrow = 'Explorer',
  footer,
  filters,
  title,
  toolbar,
}: ExplorerLayoutProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader eyebrow={eyebrow} title={title} description={description} action={actions} />
          {toolbar}
          {filters}
          {footer}
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
