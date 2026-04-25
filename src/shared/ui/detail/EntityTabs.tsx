import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn } from '@/shared/lib/cn';

export interface EntityTabItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface EntityTabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  tabs: EntityTabItem<T>[];
  children: ReactNode;
  className?: string;
  listClassName?: string;
  contentClassName?: string;
}

export function EntityTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  children,
  className,
  listClassName,
  contentClassName,
}: EntityTabsProps<T>) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as T)}
      className={className}
    >
      <div className="border-t border-slate-200 px-6 py-4">
        <TabsList
          className={cn(
            'h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 text-slate-600 shadow-none',
            listClassName
          )}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="border border-transparent bg-transparent data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              {tab.count == null ? tab.label : `${tab.label} (${tab.count})`}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className={cn('px-6 pb-6', contentClassName)}>{children}</div>
    </Tabs>
  );
}

export const EntityTabsContent = TabsContent;
