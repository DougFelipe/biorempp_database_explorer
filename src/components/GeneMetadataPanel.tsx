import type { ReactNode } from 'react';
import type { GeneMetadata, GeneMetadataSource } from '../types/database';

interface GeneMetadataPanelProps {
  metadata: GeneMetadata;
}

function displayValue(value: string | null | undefined) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized || normalized === 'NA' || normalized === 'N/A' || normalized === 'NULL' || normalized === '-') {
    return '-';
  }
  return String(value).trim();
}

function sourceBadgeClass(color: GeneMetadataSource['color']) {
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

function MetadataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[210px_minmax(0,1fr)] gap-3 py-2 border-b border-gray-100 last:border-b-0">
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

interface TokenItem {
  label: string;
  tooltip?: string | null;
  monospace?: boolean;
}

function CollapsibleTokenSection({
  title,
  items,
  monospace = false,
}: {
  title: string;
  items: TokenItem[];
  monospace?: boolean;
}) {
  if (items.length === 0) {
    return <span className="text-gray-500">-</span>;
  }

  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-sm text-blue-700 hover:text-blue-800">
        {title} ({items.length})
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 ${
              monospace || item.monospace ? 'font-mono' : ''
            }`}
            title={item.tooltip || item.label}
          >
            {item.label}
          </span>
        ))}
      </div>
    </details>
  );
}

export function GeneMetadataPanel({ metadata }: GeneMetadataPanelProps) {
  const q = metadata.quantitative_overview;
  const chebiItems = metadata.identifiers.chebi_items
    .filter((item) => item.id.trim().toUpperCase() !== 'NA')
    .map((item) => ({
      label: item.id,
      tooltip: item.compound_name || undefined,
    }));
  const smilesItems = metadata.identifiers.smiles_items
    .filter((item) => item.value.trim().toUpperCase() !== 'NA')
    .map((item) => ({
      label: item.value,
      tooltip: item.compound_name || undefined,
      monospace: true,
    }));
  const reactionItems = metadata.identifiers.reaction_items
    .filter((item) => item.id.trim().toUpperCase() !== 'NA')
    .map((item) => ({
      label: item.id,
      tooltip: item.description || undefined,
    }));
  const ecItems = metadata.identifiers.ec_numbers
    .filter((ec) => ec.trim().toUpperCase() !== 'NA')
    .map((ec) => ({ label: ec, monospace: true }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Identifiers & Interoperability</h3>
        <MetadataRow label="KO ID" value={displayValue(metadata.identifiers.ko)} />
        <MetadataRow label="Gene Symbol" value={displayValue(metadata.identifiers.gene_symbol)} />
        <MetadataRow label="Gene Name" value={displayValue(metadata.identifiers.gene_name)} />
        <MetadataRow label="KEGG KO ID" value={displayValue(metadata.identifiers.kegg_ko_id)} />
        <MetadataRow label="EC Numbers" value={<CollapsibleTokenSection title="View EC numbers" items={ecItems} monospace />} />
        <MetadataRow label="ChEBI IDs" value={<CollapsibleTokenSection title="View ChEBI IDs" items={chebiItems} />} />
        <MetadataRow label="SMILES" value={<CollapsibleTokenSection title="View SMILES" items={smilesItems} monospace />} />
        <MetadataRow label="Reaction IDs" value={<CollapsibleTokenSection title="View Reaction IDs" items={reactionItems} />} />
        <MetadataRow
          label="Data Sources"
          value={
            <div className="flex flex-wrap gap-2">
              {metadata.data_sources.length > 0 ? (
                metadata.data_sources.map((source) => (
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
          <MetricCard label="Linked Compounds" value={q.linked_compounds} />
          <MetricCard label="Compound Classes" value={q.compound_classes} />
          <MetricCard label="Pathway Annotations" value={q.pathway_annotations} />
          <MetricCard label="HADEG Pathways" value={q.pathways_hadeg} />
          <MetricCard label="KEGG Pathways" value={q.pathways_kegg} />
          <MetricCard label="BioRemPP Pathways" value={q.pathways_compound_pathway} />
          <MetricCard label="EC Count" value={q.ec_count} />
          <MetricCard label="Enzyme Activity Count" value={q.enzyme_activity_count} />
          <MetricCard label="Reference Agencies" value={q.reference_agencies} />
          <MetricCard
            label="Toxicity Coverage"
            value={q.toxicity_coverage_pct == null ? '-' : `${q.toxicity_coverage_pct}%`}
          />
          <MetricCard label="Reaction ID Count" value={q.reaction_id_count} />
        </div>
      </div>
    </div>
  );
}
