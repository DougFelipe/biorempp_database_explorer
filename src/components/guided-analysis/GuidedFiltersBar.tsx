import type { GuidedFilterDefinition, GuidedFilterOption, GuidedFilterState, GuidedFilterValue } from '../../types/guided';

interface GuidedFiltersBarProps {
  filters: GuidedFilterDefinition[];
  values: GuidedFilterState;
  optionsByFilter: Record<string, GuidedFilterOption[]>;
  onChange: (filterId: string, value: GuidedFilterValue) => void;
  onReset: () => void;
}

function toRangeValue(value: GuidedFilterValue | undefined): { min?: number; max?: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return {
    min: typeof value.min === 'number' ? value.min : undefined,
    max: typeof value.max === 'number' ? value.max : undefined,
  };
}

function updateRangeValue(
  current: { min?: number; max?: number },
  key: 'min' | 'max',
  nextRaw: string
): { min?: number; max?: number } {
  const next = { ...current };
  if (nextRaw.trim() === '') {
    delete next[key];
    return next;
  }
  const parsed = Number(nextRaw);
  if (!Number.isNaN(parsed)) {
    next[key] = parsed;
  }
  return next;
}

function renderSearchFilter(filter: GuidedFilterDefinition, value: GuidedFilterValue | undefined, onChange: GuidedFiltersBarProps['onChange']) {
  const inputId = `guided-filter-${filter.id}`;

  return (
    <div key={filter.id} className="w-full xl:col-span-2">
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 mb-1">{filter.label}</label>
      <input
        id={inputId}
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(filter.id, event.target.value)}
        placeholder={filter.placeholder || ''}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
    </div>
  );
}

function renderSelectFilter(
  filter: GuidedFilterDefinition,
  value: GuidedFilterValue | undefined,
  optionsByFilter: GuidedFiltersBarProps['optionsByFilter'],
  onChange: GuidedFiltersBarProps['onChange']
) {
  const options = optionsByFilter[filter.id] || [];
  const current = typeof value === 'string' ? value : '';
  const selectId = `guided-filter-${filter.id}`;
  return (
    <div key={filter.id} className="w-full">
      <label htmlFor={selectId} className="block text-xs font-medium text-gray-600 mb-1">{filter.label}</label>
      <select
        id={selectId}
        value={current}
        onChange={(event) => onChange(filter.id, event.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function renderRangeFilter(
  filter: GuidedFilterDefinition,
  value: GuidedFilterValue | undefined,
  onChange: GuidedFiltersBarProps['onChange']
) {
  const current = toRangeValue(value);
  const minId = `guided-filter-${filter.id}-min`;
  const maxId = `guided-filter-${filter.id}-max`;

  return (
    <div key={filter.id} className="w-full">
      <label htmlFor={minId} className="block text-xs font-medium text-gray-600 mb-1">{filter.label}</label>
      <div className="grid grid-cols-2 gap-2">
        <input
          id={minId}
          type="number"
          min={filter.min}
          max={filter.max}
          step={filter.step || 'any'}
          value={current.min ?? ''}
          onChange={(event) => onChange(filter.id, updateRangeValue(current, 'min', event.target.value))}
          placeholder="Min"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          id={maxId}
          type="number"
          min={filter.min}
          max={filter.max}
          step={filter.step || 'any'}
          value={current.max ?? ''}
          onChange={(event) => onChange(filter.id, updateRangeValue(current, 'max', event.target.value))}
          placeholder="Max"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}

function renderToggleFilter(filter: GuidedFilterDefinition, value: GuidedFilterValue | undefined, onChange: GuidedFiltersBarProps['onChange']) {
  const checked = value === true;
  return (
    <div key={filter.id} className="w-full flex items-end">
      <label className="inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-2 bg-white min-h-[42px] w-full">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(filter.id, event.target.checked)} />
        <span className="text-sm text-gray-700">{filter.label}</span>
      </label>
    </div>
  );
}

export function GuidedFiltersBar({ filters, values, optionsByFilter, onChange, onReset }: GuidedFiltersBarProps) {
  if (!filters.length) {
    return null;
  }

  return (
    <section className="rounded border border-gray-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filters</p>
        <button
          type="button"
          onClick={onReset}
          className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
        {filters.map((filter) => {
          const value = values[filter.id];
          if (filter.type === 'search') {
            return renderSearchFilter(filter, value, onChange);
          }
          if (filter.type === 'select' || filter.type === 'dependent_select') {
            return renderSelectFilter(filter, value, optionsByFilter, onChange);
          }
          if (filter.type === 'number_range') {
            return renderRangeFilter(filter, value, onChange);
          }
          if (filter.type === 'toggle') {
            return renderToggleFilter(filter, value, onChange);
          }
          return null;
        })}
      </div>
    </section>
  );
}
