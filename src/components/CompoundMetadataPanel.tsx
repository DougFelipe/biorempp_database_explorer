import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import type {
  CompoundMetadata,
  CompoundMetadataSource,
  CompoundSummary,
  ToxicityEndpoint,
} from '../types/database';

interface CompoundMetadataPanelProps {
  metadata: CompoundMetadata;
  summary: CompoundSummary;
  toxicityRows: ToxicityEndpoint[];
}

function sourceBadgeClass(color: CompoundMetadataSource['color']) {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-800';
    case 'blue':
      return 'bg-blue-100 text-blue-800';
    case 'purple':
      return 'bg-purple-100 text-purple-800';
    case 'orange':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function MetadataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export const CompoundMetadataPanel = memo(function CompoundMetadataPanel({
  metadata,
  summary,
  toxicityRows,
}: CompoundMetadataPanelProps) {
  const sources = useMemo(
    () => [...metadata.data_sources].sort((a, b) => a.name.localeCompare(b.name)),
    [metadata.data_sources]
  );

  const toxicityLabelCount = useMemo(
    () => new Set(toxicityRows.map((row) => row.label).filter(Boolean)).size,
    [toxicityRows]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Identifiers & Interoperability</h3>
        <MetadataRow label="Compound ID" value={metadata.identifiers.cpd || '-'} />
        <MetadataRow label="Compound Name" value={metadata.identifiers.compound_name || '-'} />
        <MetadataRow label="Compound Class" value={metadata.identifiers.compound_class || '-'} />
        <MetadataRow label="KEGG Compound ID" value={metadata.cross_references.kegg_compound_id || '-'} />
        <MetadataRow
          label="ChEBI"
          value={metadata.cross_references.chebi || metadata.identifiers.chebi_id || '-'}
        />
        <MetadataRow label="SMILES" value={metadata.identifiers.smiles || '-'} />
        <MetadataRow
          label="Data Sources"
          value={
            <div className="flex flex-wrap gap-2">
              {sources.length > 0 ? (
                sources.map((source) => (
                  <span
                    key={source.name}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${sourceBadgeClass(source.color)}`}
                    title={source.role}
                  >
                    {source.name}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">-</span>
              )}
            </div>
          }
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Quantitative Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <MetricCard label="KO Count" value={summary.ko_count} />
          <MetricCard label="Gene Count" value={summary.gene_count} />
          <MetricCard label="Pathway Annotations" value={summary.pathway_count} />
          <MetricCard label="EC Count" value={metadata.functional_annotation.ec_numbers.length} />
          <MetricCard label="Enzyme Activity Count" value={metadata.functional_annotation.enzyme_activity.length} />
          <MetricCard label="HADEG Pathways" value={metadata.functional_annotation.pathways_hadeg.length} />
          <MetricCard label="KEGG Pathways" value={metadata.functional_annotation.pathways_kegg.length} />
          <MetricCard
            label="Compound Pathway Class"
            value={metadata.functional_annotation.compound_pathway_class.length}
          />
          <MetricCard label="Reaction Count" value={metadata.functional_annotation.reaction_count} />
          <MetricCard label="Toxicity Endpoints" value={toxicityRows.length} />
          <MetricCard label="Toxicity Labels" value={toxicityLabelCount} />
          <MetricCard label="Cross-Ref Coverage" value={metadata.data_quality.cross_references_coverage} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Provenance</h3>
          <MetadataRow label="Version" value={metadata.provenance.version || '-'} />
          <MetadataRow label="Last Updated" value={formatDate(metadata.provenance.last_updated)} />
          <MetadataRow label="Pipeline" value={metadata.provenance.pipeline || '-'} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Data Quality</h3>
          <MetadataRow
            label="KO Format"
            value={
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  metadata.data_quality.ko_format_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {metadata.data_quality.ko_format_valid ? 'Valid' : 'Invalid'}
              </span>
            }
          />
          <MetadataRow
            label="CPD Format"
            value={
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  metadata.data_quality.cpd_format_valid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {metadata.data_quality.cpd_format_valid ? 'Valid' : 'Invalid'}
              </span>
            }
          />
          <MetadataRow label="Completeness" value={`${metadata.data_quality.completeness_pct}%`} />
          <MetadataRow label="Cross-References Coverage" value={metadata.data_quality.cross_references_coverage} />
        </div>
      </div>
    </div>
  );
});
