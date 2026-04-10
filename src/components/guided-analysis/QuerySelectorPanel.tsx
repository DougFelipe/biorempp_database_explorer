import type { GuidedCategory, GuidedQueryDefinition } from '../../types/guided';

interface QuerySelectorPanelProps {
  categories: GuidedCategory[];
  queries: GuidedQueryDefinition[];
  selectedId: string;
  onSelect: (queryId: string) => void;
}

export function QuerySelectorPanel({ categories, queries, selectedId, onSelect }: QuerySelectorPanelProps) {
  return (
    <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Guided Queries</h3>
      <div className="space-y-4">
        {categories.map((category) => {
          const categoryQueries = queries.filter((query) => query.category === category.id);
          if (categoryQueries.length === 0) {
            return null;
          }

          return (
            <div key={category.id} className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{category.label}</h4>
              <div className="space-y-2">
                {categoryQueries.map((query) => {
                  const isActive = query.id === selectedId;
                  return (
                    <button
                      key={query.id}
                      onClick={() => onSelect(query.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {query.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
