import type { GuidedExecutionMeta as GuidedExecutionMetaType } from '@/features/guided-analysis/types';

interface GuidedExecutionMetaProps {
  dataset: string;
  meta?: GuidedExecutionMetaType | null;
}

export function GuidedExecutionMeta({ dataset, meta }: GuidedExecutionMetaProps) {
  return (
    <p className="text-sm text-slate-600">
      Dataset: {dataset}
      {meta?.execution_ms !== undefined ? ` | execution ${meta.execution_ms} ms` : ''}
      {meta?.threshold_basis ? ` | thresholds: ${meta.threshold_basis}` : ''}
      {meta?.x_threshold !== undefined && meta?.y_threshold !== undefined
        ? ` (x=${meta.x_threshold}, y=${meta.y_threshold})`
        : ''}
    </p>
  );
}
