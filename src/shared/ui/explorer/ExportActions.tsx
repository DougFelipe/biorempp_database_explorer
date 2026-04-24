import type { LucideIcon } from 'lucide-react';
import type { ButtonProps } from '@/shared/ui/button';
import { Button } from '@/shared/ui/button';

export interface ExportActionItem {
  disabled?: boolean;
  icon?: LucideIcon;
  id: string;
  label: string;
  onClick: () => void | Promise<void>;
  variant?: ButtonProps['variant'];
}

interface ExportActionsProps {
  items: ExportActionItem[];
}

export function ExportActions({ items }: ExportActionsProps) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Button
            key={item.id}
            variant={item.variant || 'outline'}
            onClick={() => {
              void item.onClick();
            }}
            disabled={item.disabled}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {item.label}
          </Button>
        );
      })}
    </>
  );
}
