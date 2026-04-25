import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';

interface DetailHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack: () => void;
  backLabel?: string;
  action?: ReactNode;
  className?: string;
}

export function DetailHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Go back',
  action,
  className,
}: DetailHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label={backLabel}
          className="mt-0.5 text-slate-600 hover:text-slate-900"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="flex items-center gap-3 sm:justify-end">{action}</div> : null}
    </div>
  );
}
