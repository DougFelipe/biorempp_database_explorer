import type {
  GuidedFilterDefinition,
  GuidedFilterOption,
  GuidedFilterState,
  GuidedFilterValue,
  GuidedQueryDefinition,
} from '@/features/guided-analysis/types';

function toNumberRangeValue(rawValue: unknown): { min?: number; max?: number } {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {};
  }

  const rawRange = rawValue as { min?: unknown; max?: unknown };
  const min = typeof rawRange.min === 'number' ? rawRange.min : undefined;
  const max = typeof rawRange.max === 'number' ? rawRange.max : undefined;

  return { min, max };
}

export function toDefaultFilterValue(
  filter: GuidedFilterDefinition,
  rawValue: unknown
): GuidedFilterValue {
  if (filter.type === 'toggle') {
    return rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1';
  }

  if (filter.type === 'number_range') {
    return toNumberRangeValue(rawValue);
  }

  if (typeof rawValue === 'string') {
    return rawValue;
  }

  return '';
}

export function buildDefaultFilterState(query: GuidedQueryDefinition | null): GuidedFilterState {
  if (!query) {
    return {};
  }

  const defaults = (query.defaults?.filters || {}) as Record<string, unknown>;
  const state: GuidedFilterState = {};

  for (const filter of query.filters) {
    state[filter.id] = toDefaultFilterValue(filter, defaults[filter.id]);
  }

  return state;
}

export function getGuidedQueryPageSize(query: GuidedQueryDefinition | null): number {
  if (!query) {
    return 10;
  }

  const fromDefaults = Number(query.defaults?.page_size);
  if (!Number.isFinite(fromDefaults) || fromDefaults <= 0) {
    return 10;
  }

  return Math.min(200, Math.max(1, Math.trunc(fromDefaults)));
}

export function serializeFiltersForOptions(filters: GuidedFilterState): Record<string, string> {
  const serialized: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value.trim() !== '') {
      serialized[key] = value.trim();
      continue;
    }

    if (typeof value === 'boolean') {
      serialized[key] = value ? 'true' : 'false';
    }
  }

  return serialized;
}

export function serializeFiltersForExecute(filters: GuidedFilterState): Record<string, unknown> {
  const serialized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string') {
      if (value.trim() !== '') {
        serialized[key] = value.trim();
      }
      continue;
    }

    if (typeof value === 'boolean') {
      if (value) {
        serialized[key] = value;
      }
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const min = typeof value.min === 'number' ? value.min : undefined;
      const max = typeof value.max === 'number' ? value.max : undefined;

      if (min !== undefined || max !== undefined) {
        serialized[key] = { min, max };
      }
    }
  }

  return serialized;
}

export function shouldValidateOptions(filter: GuidedFilterDefinition): boolean {
  return filter.type === 'select' || filter.type === 'dependent_select';
}

export function sanitizeFilterStateForOptions(
  query: GuidedQueryDefinition | null,
  current: GuidedFilterState,
  optionsByFilter: Record<string, GuidedFilterOption[]>
): GuidedFilterState {
  if (!query) {
    return current;
  }

  let changed = false;
  const next: GuidedFilterState = { ...current };

  for (const filter of query.filters) {
    if (!shouldValidateOptions(filter)) {
      continue;
    }

    const options = optionsByFilter[filter.id];
    if (!options || options.length === 0) {
      continue;
    }

    const currentValue = typeof current[filter.id] === 'string' ? current[filter.id] : '';
    if (!currentValue) {
      continue;
    }

    const exists = options.some((option) => option.value === currentValue);
    if (exists) {
      continue;
    }

    next[filter.id] = filter.type === 'dependent_select' ? options[0]?.value || '' : '';
    changed = true;
  }

  return changed ? next : current;
}
