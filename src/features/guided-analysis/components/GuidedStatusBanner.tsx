import type { ReactNode } from 'react';
import { InlineStatusBanner } from '@/shared/feedback';

interface GuidedStatusBannerProps {
  tone?: 'info' | 'success' | 'warning' | 'error';
  children: ReactNode;
  className?: string;
}

export function GuidedStatusBanner({
  tone = 'info',
  children,
  className,
}: GuidedStatusBannerProps) {
  return (
    <InlineStatusBanner tone={tone} className={className}>
      {children}
    </InlineStatusBanner>
  );
}
