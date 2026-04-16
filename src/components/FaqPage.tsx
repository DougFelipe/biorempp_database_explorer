import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { FAQ_CATALOG } from '../config/faqCatalog';
import type { FaqItem, FaqNoteType, FaqSection } from '../types/faq';

interface FaqPageProps {
  onNavigateToView: (
    view: 'home' | 'database-metrics' | 'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis' | 'faq'
  ) => void;
}

function buildItemSearchText(item: FaqItem, sectionTitle: string) {
  return [
    sectionTitle,
    item.question,
    item.answer,
    item.code_example,
    item.note?.text,
    ...(item.bullets || []),
    ...(item.tags || []),
    ...(item.links || []).map((link) => `${link.label} ${link.url}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function noteStyles(type: FaqNoteType) {
  if (type === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  if (type === 'success') {
    return 'border-green-200 bg-green-50 text-green-900';
  }
  return 'border-blue-200 bg-blue-50 text-blue-900';
}

export function FaqPage({ onNavigateToView }: FaqPageProps) {
  const [search, setSearch] = useState('');
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set());

  const normalizedSearch = search.trim().toLowerCase();
  const hasSearch = normalizedSearch.length > 0;

  const filteredSections = useMemo(() => {
    if (!hasSearch) {
      return FAQ_CATALOG.sections;
    }

    return FAQ_CATALOG.sections
      .map((section) => {
        const items = section.items.filter((item) => buildItemSearchText(item, section.title).includes(normalizedSearch));
        return {
          ...section,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [hasSearch, normalizedSearch]);

  const totalItems = useMemo(
    () => filteredSections.reduce((sum, section) => sum + section.items.length, 0),
    [filteredSections]
  );

  function toggleItem(itemId: string) {
    setOpenItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function jumpToSection(sectionId: string) {
    const target = document.getElementById(`faq-section-${sectionId}`);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderSection(section: FaqSection) {
    return (
      <section key={section.id} id={`faq-section-${section.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{section.items.length} question{section.items.length === 1 ? '' : 's'}</p>
        </div>

        <div className="divide-y divide-gray-200">
          {section.items.map((item) => {
            const isOpen = hasSearch || openItemIds.has(item.id);

            return (
              <article key={item.id} className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasSearch) {
                      toggleItem(item.id);
                    }
                  }}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <h4 className="text-sm font-semibold text-gray-900">{item.question}</h4>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  )}
                </button>

                {isOpen ? (
                  <div className="mt-3 space-y-3 text-sm text-gray-700">
                    <p>{item.answer}</p>

                    {item.bullets && item.bullets.length > 0 ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {item.bullets.map((bullet, index) => (
                          <li key={`${item.id}-bullet-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}

                    {item.code_example ? (
                      <pre className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                        {item.code_example}
                      </pre>
                    ) : null}

                    {item.links && item.links.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">References</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {item.links.map((link, index) => (
                            <li key={`${item.id}-link-${index}`}>
                              <a
                                href={link.url}
                                target={link.url.startsWith('/') ? undefined : '_blank'}
                                rel={link.url.startsWith('/') ? undefined : 'noopener noreferrer'}
                                className="text-blue-700 hover:text-blue-800 underline"
                              >
                                {link.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {item.note ? (
                      <div className={`rounded-md border px-3 py-2 text-xs ${noteStyles(item.note.type)}`}>
                        {item.note.text}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900">{FAQ_CATALOG.title}</h2>
        <p className="text-sm text-gray-600 mt-2">{FAQ_CATALOG.intro}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateToView('guided-analysis')}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            Open Guided Analysis
          </button>
          <button
            type="button"
            onClick={() => onNavigateToView('database-metrics')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Database Metrics
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-4 order-2 xl:order-1">
          {filteredSections.length === 0 ? (
            <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <p className="text-sm text-gray-700">No FAQ entries matched your search. Try broader keywords.</p>
            </section>
          ) : (
            filteredSections.map(renderSection)
          )}
        </div>

        <aside className="order-1 xl:order-2 xl:sticky xl:top-24">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <header className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-base font-semibold text-gray-900">Quick Navigation</h3>
            </header>

            <div className="px-4 py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search FAQ..."
                  className="w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <p className="text-xs text-gray-500">
                {totalItems} question{totalItems === 1 ? '' : 's'} in view
              </p>

              <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                {filteredSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => jumpToSection(section.id)}
                    className="w-full inline-flex items-start gap-2 px-2 py-1.5 rounded text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowRight className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                    <span>
                      {section.title} ({section.items.length})
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
