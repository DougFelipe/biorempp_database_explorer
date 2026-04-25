import { useEffect, useState } from 'react';
import {
  getCompoundById,
  getCompoundGenes,
  getCompoundMetadata,
  getCompoundOverview,
  getCompoundToxicityProfile,
} from '@/services/api';
import type {
  CompoundGeneCardRow,
  CompoundMetadata,
  CompoundOverviewResponse,
  CompoundSummary,
  ToxicityEndpoint,
} from '@/types/database';
import { CompoundMetadataPanel } from '@/components/CompoundMetadataPanel';
import { CompoundOverviewTab } from '@/components/CompoundOverviewTab';
import { useLazyTabData } from '@/shared/hooks/useLazyTabData';
import {
  Card,
  DetailHeader,
  DetailStatusPanel,
  EntityStatStrip,
  EntityTableSection,
  EntityTabs,
  EntityTabsContent,
  LazyTabPanel,
  MetadataPanelShell,
} from '@/shared/ui';

interface CompoundDetailProps {
  cpd: string;
  onBack: () => void;
}

type CompoundTab = 'overview' | 'genes' | 'metadata';

export function CompoundDetail({ cpd, onBack }: CompoundDetailProps) {
  const [summary, setSummary] = useState<CompoundSummary | null>(null);
  const [toxicityRows, setToxicityRows] = useState<ToxicityEndpoint[]>([]);
  const [geneRows, setGeneRows] = useState<CompoundGeneCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genesLoading, setGenesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CompoundTab>('overview');
  const [genePage, setGenePage] = useState(1);
  const [geneTotalPages, setGeneTotalPages] = useState(1);
  const genePageSize = 25;

  const overviewState = useLazyTabData<CompoundOverviewResponse>({
    isActive: activeTab === 'overview',
    fetcher: () => getCompoundOverview(cpd, { top_ko: 10, top_pathways: 10 }),
    resetKeys: [cpd],
  });

  const metadataState = useLazyTabData<CompoundMetadata>({
    isActive: activeTab === 'metadata',
    fetcher: () => getCompoundMetadata(cpd),
    resetKeys: [cpd],
  });

  useEffect(() => {
    setGenePage(1);
    setActiveTab('overview');
  }, [cpd]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompoundContext() {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, toxicityData] = await Promise.all([
          getCompoundById(cpd),
          getCompoundToxicityProfile(cpd, { page: 1, pageSize: 200 }),
        ]);

        if (cancelled) {
          return;
        }

        setSummary(summaryData);
        setToxicityRows(toxicityData.data);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setSummary(null);
        setToxicityRows([]);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load compound details.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCompoundContext();

    return () => {
      cancelled = true;
    };
  }, [cpd]);

  useEffect(() => {
    let cancelled = false;

    async function loadGenesPage() {
      setGenesLoading(true);
      try {
        const genesData = await getCompoundGenes(cpd, { page: genePage, pageSize: genePageSize });
        if (cancelled) {
          return;
        }
        setGeneRows(genesData.data);
        setGeneTotalPages(genesData.totalPages);
      } catch {
        if (cancelled) {
          return;
        }
        setGeneRows([]);
        setGeneTotalPages(1);
      } finally {
        if (!cancelled) {
          setGenesLoading(false);
        }
      }
    }

    loadGenesPage();

    return () => {
      cancelled = true;
    };
  }, [cpd, genePage]);

  if (loading) {
    return (
      <DetailStatusPanel
        status="loading"
        title="Loading compound details"
        message="Please wait while the compound detail view is prepared."
      />
    );
  }

  if (error) {
    return (
      <DetailStatusPanel
        status="error"
        title="Unable to load compound details."
        message={error}
        onBack={onBack}
        backLabel="Back to Compounds"
      />
    );
  }

  if (!summary) {
    return (
      <DetailStatusPanel
        status="not-found"
        title="Compound not found."
        message="The selected compound could not be loaded."
        onBack={onBack}
        backLabel="Back to Compounds"
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <DetailHeader
        title={summary.compoundname || summary.cpd}
        subtitle={summary.cpd}
        onBack={onBack}
        backLabel="Back to Compounds"
      />

      <EntityStatStrip
        items={[
          { label: 'Class', value: summary.compoundclass || '-' },
          { label: 'Reference', value: summary.reference_ag || '-' },
          { label: 'KO Count', value: summary.ko_count },
          { label: 'Gene Count', value: summary.gene_count },
          {
            label: 'Pathway Annotations',
            value: summary.pathway_count,
            hint: 'Includes HADEG, KEGG and Compound Pathway annotations',
          },
          {
            label: 'Toxicity Risk Mean',
            value: summary.toxicity_risk_mean == null ? '-' : summary.toxicity_risk_mean.toFixed(2),
          },
          summary.smiles
            ? {
                label: 'SMILES',
                value: summary.smiles,
                span: 'full' as const,
                valueClassName: 'font-mono text-base break-all',
              }
            : {
                label: 'SMILES',
                value: '-',
                span: 'full' as const,
                valueClassName: 'font-mono text-base break-all',
              },
        ]}
      />

      <EntityTabs
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'genes', label: 'Associated Genes', count: summary.gene_count },
          { value: 'metadata', label: 'Metadata' },
        ]}
      >
        <EntityTabsContent value="overview">
          <LazyTabPanel
            state={overviewState}
            loadingTitle="Loading overview"
            loadingMessage="Please wait while the compound overview is prepared."
            emptyTitle="Overview unavailable"
            emptyMessage="No overview data available."
            errorTitle="Unable to load overview."
          >
            {(overview) => <CompoundOverviewTab overview={overview} />}
          </LazyTabPanel>
        </EntityTabsContent>

        <EntityTabsContent value="genes">
          <EntityTableSection
            rows={geneRows}
            loading={genesLoading}
            getRowKey={(detail, index) => `${detail.ko}-${detail.genesymbol}-${index}`}
            emptyTitle="No genes available"
            emptyMessage="No gene data available for this compound."
            pagination={{
              currentPage: genePage,
              totalPages: geneTotalPages,
              onPageChange: setGenePage,
            }}
            columns={[
              {
                key: 'ko',
                header: 'KO',
                cellClassName: 'font-mono',
                render: (detail) => detail.ko || '-',
              },
              {
                key: 'genesymbol',
                header: 'Gene Symbol',
                cellClassName: 'font-medium text-slate-900',
                render: (detail) => detail.genesymbol || '-',
              },
              {
                key: 'genename',
                header: 'Gene Name',
                render: (detail) => detail.genename || '-',
              },
              {
                key: 'enzyme_activity',
                header: 'Enzyme Activity',
                render: (detail) => detail.enzyme_activity || '-',
              },
              {
                key: 'ec',
                header: 'EC',
                cellClassName: 'font-mono',
                render: (detail) => detail.ec || '-',
              },
            ]}
          />
        </EntityTabsContent>

        <EntityTabsContent value="metadata">
          <LazyTabPanel
            state={metadataState}
            loadingTitle="Loading metadata"
            loadingMessage="Please wait while the compound metadata is prepared."
            emptyTitle="Metadata unavailable"
            emptyMessage="Metadata unavailable for this compound."
            errorTitle="Unable to load metadata."
          >
            {(metadata) => (
              <MetadataPanelShell
                title="Compound metadata"
                description="Identifiers, provenance and cross-reference coverage for the selected compound."
              >
                <CompoundMetadataPanel metadata={metadata} summary={summary} toxicityRows={toxicityRows} />
              </MetadataPanelShell>
            )}
          </LazyTabPanel>
        </EntityTabsContent>
      </EntityTabs>
    </Card>
  );
}
