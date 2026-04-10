import type { GuidedQueryDefinition } from './guidedQueries';

interface QuerySelectorPanelProps {
  queries: GuidedQueryDefinition[];
  selectedId: string;
  onSelect: (queryId: string) => void;
}

export function QuerySelectorPanel({ queries, selectedId, onSelect }: QuerySelectorPanelProps) {
  return (
    <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Compound Analysis</h3>
      <div className="space-y-2">
        {queries.map((query) => {
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
    </aside>
  );
}

