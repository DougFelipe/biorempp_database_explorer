import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface ChartTooltipProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
  children?: ReactNode;
}

export function ChartTooltip({
  content,
  children,
  className,
  ...props
}: ChartTooltipProps) {
  return (
    <div title={content} className={cn(className)} {...props}>
      {children}
    </div>
  );
}
