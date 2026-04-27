import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Database, Download, FileSpreadsheet, Quote } from 'lucide-react';
import type { View } from '../app/routes';
import { DOWNLOAD_CATALOG } from '../config/downloadCatalog';
import { HOME_EDITORIAL_CATALOG } from '../config/homeCatalog';
import { CLIENT_BASE_PATH } from '../shared/api/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
  SectionHeader,
} from '../shared/ui';
import { withBasePath } from '../utils/basePath';
import { DatabaseSnapshotSection } from './home/DatabaseSnapshotSection';

interface HomePageProps {
  onNavigateToView: (view: View) => void;
}

function iconForFormat(format: string) {
  return format.toUpperCase() === 'SQLITE' ? Database : FileSpreadsheet;
}

function renderParagraphs(items: string[], className: string) {
  return items.map((paragraph) => (
    <p key={paragraph} className={className}>
      {paragraph}
    </p>
  ));
}

function DownloadCatalogCard({
  item,
  onReview,
}: {
  item: (typeof DOWNLOAD_CATALOG.items)[number];
  onReview: (id: string) => void;
}) {
  const Icon = iconForFormat(item.format);

  return (
    <Card className="rounded-2xl border-slate-200 bg-slate-50/70 shadow-soft">
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

        <Button className="w-full justify-between" onClick={() => onReview(item.id)}>
          <span className="inline-flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {HOME_EDITORIAL_CATALOG.downloads.disclaimer_title}
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function BrowseByCategorySection({
  onNavigateToView,
}: {
  onNavigateToView: (view: View) => void;
}) {
  const browseSection = HOME_EDITORIAL_CATALOG.browse_section;

  return (
    <Card>
      <CardContent className="space-y-6 px-6 py-6">
        <SectionHeader
          eyebrow={browseSection.eyebrow}
          title={browseSection.title}
          description={browseSection.description}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {browseSection.items.map((item) => (
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
  );
}

export function HomePage({ onNavigateToView }: HomePageProps) {
  const [selectedDownloadId, setSelectedDownloadId] = useState<string | null>(null);
  const [heroDialogId, setHeroDialogId] = useState<'terms-of-use' | 'how-to-cite' | null>(null);
  const homeContent = HOME_EDITORIAL_CATALOG;

  const selectedDownload = useMemo(
    () => DOWNLOAD_CATALOG.items.find((item) => item.id === selectedDownloadId) || null,
    [selectedDownloadId]
  );
  const selectedHeroModal = useMemo(() => {
    if (heroDialogId === 'terms-of-use') {
      return homeContent.hero.modals.terms_of_use;
    }
    if (heroDialogId === 'how-to-cite') {
      return homeContent.hero.modals.how_to_cite;
    }
    return null;
  }, [heroDialogId, homeContent.hero.modals]);
  const primaryDownload = DOWNLOAD_CATALOG.items[0] || null;
  const secondaryDownloads = DOWNLOAD_CATALOG.items.slice(1);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader eyebrow={homeContent.scientific_overview.eyebrow} title={homeContent.hero.title} />

          <div className="grid grid-cols-1 items-center gap-8 xl:grid-cols-[minmax(15rem,0.85fr)_minmax(0,1.15fr)]">
            <div className="flex justify-center xl:justify-start">
              <img
                src={withBasePath('/BIOREMPP_LOGO.png', CLIENT_BASE_PATH)}
                alt="BioRemPP logo"
                className="h-auto w-full max-w-[12rem] object-contain sm:max-w-[16rem] xl:max-w-[18rem]"
              />
            </div>

            <div className="space-y-5 text-center xl:text-center">
              <p className="text-base leading-7 text-slate-700 sm:text-lg">
                {homeContent.hero.subtitle}
              </p>

              <div className="space-y-3">
                {renderParagraphs(homeContent.hero.description, 'text-sm leading-7 text-slate-600 sm:text-base')}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {homeContent.hero.cta_buttons.map((button) => {
                  const icon = button.id === 'terms-of-use' ? AlertTriangle : Quote;
                  const variant = button.variant === 'warning' ? 'outline' : button.variant;
                  const Icon = icon;

                  return (
                    <Button
                      key={button.id}
                      variant={variant}
                      size="lg"
                      onClick={() => setHeroDialogId(button.id)}
                      className={
                        button.id === 'terms-of-use'
                          ? 'border-amber-200 bg-amber-100 text-amber-800 hover:border-amber-300 hover:bg-amber-200'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {button.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center">
            <div className="space-y-2">
              <p className="text-sm leading-6 text-emerald-900">{homeContent.hero.access_statement}</p>
              {homeContent.hero.notice_lines.map((line) => (
                <p key={line} className="text-sm leading-6 text-emerald-900">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow={homeContent.scientific_overview.eyebrow}
            title={homeContent.scientific_overview.title}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="surface-muted px-5 py-5">
              <div className="space-y-3">
                {renderParagraphs(homeContent.scientific_overview.content, 'text-sm leading-6 text-slate-600')}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-soft">
                <p className="text-sm font-semibold text-slate-950">{homeContent.data_sources.title}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  {homeContent.data_sources.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {homeContent.data_sources.footer ? (
                  <p className="mt-4 text-xs leading-5 text-slate-500">{homeContent.data_sources.footer}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-soft">
                <p className="text-sm font-semibold text-slate-950">{homeContent.target_users.title}</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  {homeContent.target_users.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <BrowseByCategorySection onNavigateToView={onNavigateToView} />

      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow={homeContent.guided_analysis.eyebrow}
            title={homeContent.guided_analysis.title}
            description={homeContent.guided_analysis.description[0]}
            action={
              <Button variant="subtle" onClick={() => onNavigateToView('guided-analysis')}>
                {homeContent.guided_analysis.cta_label}
              </Button>
            }
          />

          <div className="space-y-3">
            {renderParagraphs(homeContent.guided_analysis.description.slice(1), 'text-sm leading-6 text-slate-600')}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {homeContent.guided_analysis.panels.map((panel) => (
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
            {homeContent.guided_analysis.scope_note}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow={homeContent.downloads.eyebrow}
            title={
              <span className="inline-flex items-center gap-2">
                <Download className="h-5 w-5 text-accent" />
                {homeContent.downloads.title}
              </span>
            }
            description={homeContent.downloads.description[0]}
          />

          <div className="space-y-3">
            {renderParagraphs(homeContent.downloads.description.slice(1), 'text-sm leading-6 text-slate-600')}
          </div>

          {primaryDownload ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">{homeContent.downloads.primary_title}</p>
                <p className="text-sm leading-6 text-slate-600">{homeContent.downloads.primary_description}</p>
              </div>

              <DownloadCatalogCard item={primaryDownload} onReview={setSelectedDownloadId} />

              {secondaryDownloads.length > 0 ? (
                <Accordion type="single" collapsible className="rounded-2xl border border-slate-200 bg-white px-5">
                  <AccordionItem value="other-database-downloads" className="border-b-0">
                    <AccordionTrigger className="py-5 text-base">
                      <span className="space-y-1">
                        <span className="block text-sm font-semibold text-slate-950">
                          {homeContent.downloads.accordion_title} ({secondaryDownloads.length})
                        </span>
                        <span className="block text-xs font-normal leading-5 text-slate-500">
                          {homeContent.downloads.accordion_description}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                        {secondaryDownloads.map((item) => (
                          <DownloadCatalogCard key={item.id} item={item} onReview={setSelectedDownloadId} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DatabaseSnapshotSection
        eyebrow={homeContent.snapshot.eyebrow}
        title={homeContent.snapshot.title}
        description={homeContent.snapshot.description}
        actionLabel={homeContent.snapshot.action_label}
        onOpenDatabaseMetrics={() => onNavigateToView('database-metrics')}
      />

      <Card>
        <CardContent className="space-y-6 px-6 py-6">
          <SectionHeader
            eyebrow={homeContent.limitations.eyebrow}
            title={homeContent.limitations.title}
          />

          <div className="surface-muted px-5 py-5">
            <div className="space-y-3">
              {renderParagraphs(homeContent.limitations.content, 'text-sm leading-6 text-slate-600')}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(heroDialogId)}
        onOpenChange={(open) => setHeroDialogId(open ? heroDialogId : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedHeroModal?.title ?? homeContent.hero.title}</DialogTitle>
            <DialogDescription>{selectedHeroModal?.description ?? homeContent.hero.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm leading-6 text-slate-700">
            {selectedHeroModal?.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHeroDialogId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedDownload)}
        onOpenChange={(open) => setSelectedDownloadId(open ? selectedDownloadId : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{homeContent.downloads.disclaimer_title}</DialogTitle>
            <DialogDescription>
              {selectedDownload
                ? `${selectedDownload.label} / ${selectedDownload.format} / ${selectedDownload.version}`
                : homeContent.downloads.primary_description}
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

            {homeContent.downloads.disclaimer_paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            {selectedDownload ? (
              <p>
                {homeContent.downloads.selected_release_prefix}:
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
              {homeContent.downloads.close_label}
            </Button>
            {selectedDownload ? (
              <Button asChild>
                <a href={selectedDownload.url} target="_blank" rel="noopener noreferrer">
                  {homeContent.downloads.open_release_label}
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
