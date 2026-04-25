import { GuidedFiltersBar } from '@/components/guided-analysis/GuidedFiltersBar';
import type {
  GuidedFilterOption,
  GuidedFilterState,
  GuidedFilterValue,
  GuidedQueryDefinition,
} from '@/features/guided-analysis/types';
import { Card, CardContent } from '@/shared/ui';
import { GuidedStatusBanner } from '@/features/guided-analysis/components/GuidedStatusBanner';

interface GuidedFiltersPanelProps {
  query: GuidedQueryDefinition;
  values: GuidedFilterState;
  optionsByFilter: Record<string, GuidedFilterOption[]>;
  optionsError: string | null;
  onChange: (filterId: string, value: GuidedFilterValue) => void;
  onReset: () => void;
}

export function GuidedFiltersPanel({
  query,
  values,
  optionsByFilter,
  optionsError,
  onChange,
  onReset,
}: GuidedFiltersPanelProps) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        {optionsError ? (
          <GuidedStatusBanner tone="warning">
            Unable to refresh dependent filter options. Current filters remain available.
          </GuidedStatusBanner>
        ) : null}

        <GuidedFiltersBar
          filters={query.filters}
          values={values}
          optionsByFilter={optionsByFilter}
          onChange={onChange}
          onReset={onReset}
        />
      </CardContent>
    </Card>
  );
}
