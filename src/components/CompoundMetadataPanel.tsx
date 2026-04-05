import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { CompoundMetadata, CompoundMetadataSource } from '../types/database';

interface CompoundMetadataPanelProps {
  metadata: CompoundMetadata;
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

function ListChips({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-gray-500">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
          {value}
        </span>
      ))}
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

export const CompoundMetadataPanel = memo(function CompoundMetadataPanel({
  metadata,
}: CompoundMetadataPanelProps) {
  const sources = useMemo(
    () => [...metadata.data_sources].sort((a, b) => a.name.localeCompare(b.name)),
    [metadata.data_sources]
  );

  return (
    <div className="px-6 py-4 bg-white border-b border-gray-200 space-y-3">
      <h3 className="text-base font-semibold text-gray-900">Structured Metadata</h3>

      <details open className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-gray-800">Identifiers</summary>
        <div className="px-4 pb-3">
          <MetadataRow label="Compound ID" value={metadata.identifiers.cpd || '-'} />
          <MetadataRow label="Compound Name" value={metadata.identifiers.compound_name || '-'} />
          <MetadataRow label="Compound Class" value={metadata.identifiers.compound_class || '-'} />
          <MetadataRow label="KO IDs" value={<ListChips values={metadata.identifiers.ko_ids} />} />
          <MetadataRow label="Gene Symbols" value={<ListChips values={metadata.identifiers.gene_symbols} />} />
          <MetadataRow label="Gene Names" value={<ListChips values={metadata.identifiers.gene_names} />} />
          <MetadataRow label="ChEBI ID" value={metadata.identifiers.chebi_id || '-'} />
          <MetadataRow label="SMILES" value={metadata.identifiers.smiles || '-'} />
        </div>
      </details>

      <details className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-gray-800">
          Functional Annotation
        </summary>
        <div className="px-4 pb-3">
          <MetadataRow
            label="Enzyme Activity"
            value={<ListChips values={metadata.functional_annotation.enzyme_activity} />}
          />
          <MetadataRow label="EC Number" value={<ListChips values={metadata.functional_annotation.ec_numbers} />} />
          <MetadataRow
            label="Pathways (HADEG)"
            value={<ListChips values={metadata.functional_annotation.pathways_hadeg} />}
          />
          <MetadataRow
            label="Pathways (KEGG)"
            value={<ListChips values={metadata.functional_annotation.pathways_kegg} />}
          />
          <MetadataRow
            label="Compound Pathway Class"
            value={<ListChips values={metadata.functional_annotation.compound_pathway_class} />}
          />
          <MetadataRow label="Reaction Count" value={metadata.functional_annotation.reaction_count} />
        </div>
      </details>

      <details open className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-gray-800">Chemical Information</summary>
        <div className="px-4 pb-3">
          <MetadataRow label="Compound Name" value={metadata.chemical_information.compound_name || '-'} />
          <MetadataRow label="Compound Class" value={metadata.chemical_information.compound_class || '-'} />
          <MetadataRow label="SMILES" value={metadata.chemical_information.smiles || '-'} />
          <MetadataRow label="ChEBI" value={metadata.chemical_information.chebi || '-'} />
        </div>
      </details>

      <details className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-gray-800">Data Sources</summary>
        <div className="px-4 pb-3 space-y-2">
          {sources.length === 0 ? (
            <p className="text-sm text-gray-500">-</p>
          ) : (
            sources.map((source) => (
              <div key={source.name} className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${sourceBadgeClass(source.color)}`}>
                  {source.name}
                </span>
                <span className="text-sm text-gray-700">{source.role}</span>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-gray-800">Provenance</summary>
        <div className="px-4 pb-3">
          <MetadataRow label="Version" value={metadata.provenance.version || '-'} />
          <MetadataRow label="Last Updated" value={formatDate(metadata.provenance.last_updated)} />
          <MetadataRow label="Pipeline" value={metadata.provenance.pipeline || '-'} />
        </div>
      </details>

      <details className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-gray-800">Cross-References</summary>
        <div className="px-4 pb-3">
          <MetadataRow label="KEGG Compound ID" value={metadata.cross_references.kegg_compound_id || '-'} />
          <MetadataRow label="ChEBI" value={metadata.cross_references.chebi || '-'} />
          <MetadataRow label="EC Numbers" value={<ListChips values={metadata.cross_references.ec_numbers} />} />
          <MetadataRow label="Reaction Count" value={metadata.cross_references.reaction_count} />
        </div>
      </details>

      <details className="rounded-lg border border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-gray-800">Data Quality</summary>
        <div className="px-4 pb-3">
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
      </details>
    </div>
  );
});
