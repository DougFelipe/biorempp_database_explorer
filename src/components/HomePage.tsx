import { useMemo, useState } from 'react';
import { ArrowUpRight, Database, Download, FileSpreadsheet } from 'lucide-react';
import type { View } from '../app/routes';
import { DOWNLOAD_CATALOG } from '../config/downloadCatalog';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  MetricCard,
  SectionHeader,
} from '../shared/ui';
import { DatabaseSnapshotSection } from './home/DatabaseSnapshotSection';

interface HomePageProps {
  onNavigateToView: (view: View) => void;
}

const BROWSE_BY_CATEGORY_ITEMS: Array<{
  id: Extract<View, 'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis'>;
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

const GUIDED_ANALYSIS_PANELS = [
  {
    title: 'What is implemented',
    bullets: [
      'Compound, Pathway and Gene/KO analytical blocks with curated use cases.',
      'Ranking and association analyses for bioremediation potential and toxicological context.',
      'Cross-database exploratory views (BioRemPP, KEGG, HADEG, ToxCSM).',
    ],
  },
  {
    title: 'Visual outputs and metrics',
    bullets: [
      'Horizontal bar rankings, toxicity heatmaps, risk-vs-potential scatter, and distribution plots.',
      'Summary cards with scope, ranked entities, excluded records and execution context.',
      'Tabular outputs aligned with plotted data and paginated for inspection.',
    ],
  },
  {
    title: 'Filtering and analytical controls',
    bullets: [
      'Endpoint and endpoint-group filters for toxicity-focused analyses.',
      'Ranges for KO count, gene count, pathway annotations and prediction thresholds.',
      'Search filters for compounds and contextual selectors by class/source.',
    ],
  },
  {
    title: 'Reproducibility templates',
    bullets: [
      'Per-use-case methods modal describing transformation and analytical steps.',
      'Per-use-case SQLite and Python query recipes for output replication.',
      'Declarative YAML configuration for use-case text, filters and execution contract.',
    ],
  },
];

function iconForFormat(format: string) {
  return format.toUpperCase() === 'SQLITE' ? Database : FileSpreadsheet;
}

export function HomePage({ onNavigateToView }: HomePageProps) {
  const [selectedDownloadId, setSelectedDownloadId] = useState<string | null>(null);

  const selectedDownload = useMemo(
    () => DOWNLOAD_CATALOG.items.find((item) => item.id === selectedDownloadId) || null,
    [selectedDownloadId]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow="Overview"
            title="Home"
            description="Access dataset downloads hosted externally on Zenodo, inspect the current database metrics, and jump into the main scientific exploration modules."
            action={<Badge variant="subtle">Functional beta</Badge>}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
            <div className="surface-muted px-5 py-5">
              <p className="text-sm font-semibold text-slate-900">Current focus</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Preserve scientific coverage while hardening navigation, metric readability, and reproducibility
                touchpoints. This first shell keeps the app lightweight and direct, but removes the roughest UI edges.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MetricCard label="Downloads catalog" value={DOWNLOAD_CATALOG.items.length} hint="Zenodo-hosted packages" />
              <MetricCard label="Primary entry points" value={BROWSE_BY_CATEGORY_ITEMS.length} hint="Exploration modules" />
              <MetricCard label="Documentation mode" value="Structured" hint="Metrics, FAQ and guided analysis kept aligned" />
            </div>
          </div>
        </CardContent>
      </Card>

      <DatabaseSnapshotSection onOpenDatabaseMetrics={() => onNavigateToView('database-metrics')} />

      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow="Analysis"
            title="Guided Analysis"
            description="Guided Analysis centralizes exploratory workflows executed server-side on SQLite from declarative YAML templates. Each use case is structured with scientific question, reproducible filtering, standardized outputs, and explicit interpretation scope for hypothesis generation."
            action={
              <Button variant="subtle" onClick={() => onNavigateToView('guided-analysis')}>
                Open Guided Analysis
              </Button>
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {GUIDED_ANALYSIS_PANELS.map((panel) => (
              <div key={panel.title} className="surface-muted px-4 py-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{panel.title}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {panel.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="surface-muted px-4 py-3 text-xs leading-5 text-slate-500">
            Scope: exploratory analysis and hypothesis generation; results should not be interpreted as causal or
            confirmatory evidence without external validation.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow="Access"
            title={
              <span className="inline-flex items-center gap-2">
                <Download className="h-5 w-5 text-accent" />
                {DOWNLOAD_CATALOG.title}
              </span>
            }
            description={
              DOWNLOAD_CATALOG.note ||
              'Dataset packages are distributed externally and linked here for controlled release access.'
            }
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DOWNLOAD_CATALOG.items.map((item) => {
              const Icon = iconForFormat(item.format);
              return (
                <Card key={item.id} className="rounded-2xl border-slate-200 bg-slate-50/70 shadow-soft">
                  <CardContent className="space-y-4 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.source}</p>
                      </div>
                      <Badge variant="outline">{item.format}</Badge>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <p>Version: {item.version}</p>
                      {item.size ? <p>Size: {item.size}</p> : null}
                      {item.updated_at ? <p>Updated: {item.updated_at}</p> : null}
                    </div>

                    <Button className="w-full justify-between" onClick={() => setSelectedDownloadId(item.id)}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        Review download
                      </span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow="Explore"
            title="Browse by Category"
            description="Open explorers and analysis views from a single navigation panel."
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {BROWSE_BY_CATEGORY_ITEMS.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                size="lg"
                onClick={() => onNavigateToView(item.id)}
                className="h-auto justify-start rounded-2xl border-slate-200 px-4 py-4 text-left"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                  <p className="text-xs leading-5 text-slate-600">{item.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedDownload)} onOpenChange={(open) => setSelectedDownloadId(open ? selectedDownloadId : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Disclaimer</DialogTitle>
            <DialogDescription>
              {selectedDownload
                ? `${selectedDownload.label} · ${selectedDownload.format} · ${selectedDownload.version}`
                : 'Review release constraints before opening the external download page.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm leading-6 text-slate-700">
            {selectedDownload ? (
              <div className="surface-muted px-4 py-3 text-xs leading-5 text-slate-500">
                <p>Source: {selectedDownload.source}</p>
                {selectedDownload.size ? <p>Size: {selectedDownload.size}</p> : null}
                {selectedDownload.updated_at ? <p>Updated: {selectedDownload.updated_at}</p> : null}
              </div>
            ) : null}

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
            {selectedDownload ? (
              <p>
                Selected release:
                <a
                  href={selectedDownload.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-accent underline-offset-4 hover:underline"
                >
                  {selectedDownload.url}
                </a>
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDownloadId(null)}>
              Close
            </Button>
            {selectedDownload ? (
              <Button asChild>
                <a href={selectedDownload.url} target="_blank" rel="noopener noreferrer">
                  Open release
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
