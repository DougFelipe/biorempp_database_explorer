import { ArrowUpRight, Database, Download, FileSpreadsheet } from 'lucide-react';
import { DOWNLOAD_CATALOG } from '../config/downloadCatalog';

interface HomePageProps {
  onNavigateToView: (view: 'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis') => void;
}

const QUICK_LINKS: Array<{
  id: 'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis';
  label: string;
  description: string;
}> = [
  { id: 'compounds', label: 'Compounds', description: 'Explore compound-level integrated summaries and details.' },
  { id: 'compound-classes', label: 'Compound Classes', description: 'Browse aggregate analytics by BioRemPP classes.' },
  { id: 'genes', label: 'Genes / KO', description: 'Inspect KO/gene summaries and coverage.' },
  { id: 'pathways', label: 'Pathways', description: 'Review KEGG/HADEG pathway-level relationships.' },
  { id: 'toxicity', label: 'Toxicity', description: 'Navigate endpoint-level ToxCSM predictions.' },
  { id: 'guided-analysis', label: 'Guided Analysis', description: 'Run curated use cases with reproducible outputs.' },
];

function iconForFormat(format: string) {
  return format.toUpperCase() === 'SQLITE' ? Database : FileSpreadsheet;
}

export function HomePage({ onNavigateToView }: HomePageProps) {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">Home</h2>
        <p className="mt-2 text-sm text-gray-600">
          Access dataset downloads hosted externally on Zenodo and jump directly to the main exploration modules.
        </p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{DOWNLOAD_CATALOG.title}</h3>
        </div>
        {DOWNLOAD_CATALOG.note ? (
          <p className="text-sm text-gray-600">{DOWNLOAD_CATALOG.note}</p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DOWNLOAD_CATALOG.items.map((item) => {
            const Icon = iconForFormat(item.format);
            return (
              <article key={item.id} className="rounded-lg border border-gray-200 p-4 bg-gray-50/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.source}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {item.format}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-gray-600">
                  <p>Version: {item.version}</p>
                  {item.size ? <p>Size: {item.size}</p> : null}
                  {item.updated_at ? <p>Updated: {item.updated_at}</p> : null}
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Icon className="w-4 h-4" />
                  Download
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Explore Modules</h3>
        <p className="mt-1 text-sm text-gray-600">
          Open the explorers and guided use cases from here.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {QUICK_LINKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigateToView(item.id)}
              className="text-left rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
            >
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="mt-1 text-xs text-gray-600">{item.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
