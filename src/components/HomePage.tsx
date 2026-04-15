import { useEffect, useState } from 'react';
import { ArrowUpRight, Database, Download, FileSpreadsheet, X } from 'lucide-react';
import { DOWNLOAD_CATALOG } from '../config/downloadCatalog';
import { DatabaseSnapshotSection } from './home/DatabaseSnapshotSection';

interface HomePageProps {
  onNavigateToView: (
    view: 'database-metrics' | 'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis'
  ) => void;
}

const BROWSE_BY_CATEGORY_ITEMS: Array<{
  id: 'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis';
  label: string;
  description: string;
}> = [
  { id: 'compounds', label: 'Compounds', description: 'Explore compound-level integrated summaries and details.' },
  { id: 'compound-classes', label: 'Compound Classes', description: 'Browse aggregate analytics by BioRemPP classes.' },
  { id: 'genes', label: 'Genes / KO', description: 'Inspect KO and gene-level records and relationships.' },
  { id: 'pathways', label: 'Pathways', description: 'Review KEGG and HADEG pathway-level relationships.' },
  { id: 'toxicity', label: 'Toxicity', description: 'Navigate endpoint-level ToxCSM predictions.' },
  { id: 'guided-analysis', label: 'Guided Analysis', description: 'Run curated analytical use cases with reproducible outputs.' },
];

function iconForFormat(format: string) {
  return format.toUpperCase() === 'SQLITE' ? Database : FileSpreadsheet;
}

export function HomePage({ onNavigateToView }: HomePageProps) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [selectedDownloadLabel, setSelectedDownloadLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!disclaimerOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDisclaimerOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [disclaimerOpen]);

  function openDisclaimer(downloadLabel: string) {
    setSelectedDownloadLabel(downloadLabel);
    setDisclaimerOpen(true);
  }

  function closeDisclaimer() {
    setDisclaimerOpen(false);
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">Home</h2>
        <p className="mt-2 text-sm text-gray-600">
          Access dataset downloads hosted externally on Zenodo and inspect the current database metrics.
        </p>
      </section>

      <DatabaseSnapshotSection onOpenDatabaseMetrics={() => onNavigateToView('database-metrics')} />

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-4 max-w-5xl">
            <h3 className="text-lg font-semibold text-gray-900">Guided Analysis</h3>
            <p className="text-sm text-gray-600">
              Guided Analysis centralizes exploratory workflows executed server-side on SQLite from declarative YAML
              templates. Each use case is structured with scientific question, reproducible filtering, standardized
              outputs, and explicit interpretation scope for hypothesis generation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="font-medium text-gray-900">What is implemented</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Compound, Pathway and Gene/KO analytical blocks with curated use cases.</li>
                  <li>Ranking and association analyses for bioremediation potential and toxicological context.</li>
                  <li>Cross-database exploratory views (BioRemPP, KEGG, HADEG, ToxCSM).</li>
                </ul>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="font-medium text-gray-900">Visual outputs and metrics</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Horizontal bar rankings, toxicity heatmaps, risk-vs-potential scatter, and distribution plots.</li>
                  <li>Summary cards with scope, ranked entities, excluded records and execution context.</li>
                  <li>Tabular outputs aligned with plotted data and paginated for inspection.</li>
                </ul>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="font-medium text-gray-900">Filtering and analytical controls</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Endpoint and endpoint-group filters for toxicity-focused analyses.</li>
                  <li>Ranges for KO count, gene count, pathway annotations and prediction thresholds.</li>
                  <li>Search filters for compounds and contextual selectors by class/source.</li>
                </ul>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="font-medium text-gray-900">Reproducibility templates</p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Per-use-case methods modal describing transformation and analytical steps.</li>
                  <li>Per-use-case SQLite and Python query recipes for output replication.</li>
                  <li>Declarative YAML configuration for use-case text, filters and execution contract.</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Scope: exploratory analysis and hypothesis generation; results should not be interpreted as causal or
              confirmatory evidence without external validation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToView('guided-analysis')}
            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            Open Guided Analysis
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <details className="group">
          <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">{DOWNLOAD_CATALOG.title}</h3>
            </div>
            <span className="text-sm text-gray-500 group-open:hidden">Show</span>
            <span className="text-sm text-gray-500 hidden group-open:inline">Hide</span>
          </summary>

          <div className="mt-4 space-y-4">
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

                    <button
                      type="button"
                      onClick={() => openDisclaimer(item.label)}
                      className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Icon className="w-4 h-4" />
                      Download
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </details>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Browse by Category</h3>
        <p className="mt-1 text-sm text-gray-600">
          Open explorers and analysis views from a single navigation panel.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {BROWSE_BY_CATEGORY_ITEMS.map((item) => (
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

      {disclaimerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          role="presentation"
          onClick={closeDisclaimer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="download-disclaimer-title"
            className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-white shadow-2xl border border-gray-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div>
                <h3 id="download-disclaimer-title" className="text-lg font-semibold text-gray-900">
                  Download Disclaimer
                </h3>
                {selectedDownloadLabel ? (
                  <p className="text-sm text-gray-500 mt-1">{selectedDownloadLabel}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeDisclaimer}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close download disclaimer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
              <p>
                For compliance during this development phase, only BioRemPP database version <strong>1.0.0</strong> is
                currently available for public download.
              </p>
              <p>
                The stable version <strong>1.1.0</strong> is being implemented for release together with the Snakemake
                pipeline to ensure BioRemPP database reproducibility.
              </p>
              <p>
                Release <strong>1.1.0</strong> will add EC, Reaction ID and Reaction Description information to expand
                interoperability and support metabolomics-based inference workflows.
              </p>
              <p>
                Current public release:
                <a
                  href="https://zenodo.org/records/18905195"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-700 hover:text-blue-800 underline"
                >
                  https://zenodo.org/records/18905195
                </a>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 bg-gray-50">
              <button
                type="button"
                onClick={closeDisclaimer}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
              <a
                href="https://zenodo.org/records/18905195"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Open Zenodo v1.0.0
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
