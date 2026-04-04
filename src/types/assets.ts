import type { CompoundSummary, GeneSummary, IntegratedData, PathwaySummary, ToxicityEndpoint } from './database';

export interface ToxicityMatrixRow extends ToxicityEndpoint {}

export interface NetworkGraphNode {
  id: string;
  label: string;
  type: 'ko' | 'gene' | 'compound' | 'pathway';
}

export interface NetworkGraphEdge {
  source: string;
  target: string;
  kind: 'ko_to_gene' | 'gene_to_compound' | 'compound_to_pathway';
}

export interface NetworkGraphData {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}

export interface SankeyDatum {
  ko: string;
  cpd: string;
  endpoint: string;
  label: string | null;
  value: number | null;
}

export interface IntegratedTableIndexRow {
  cpd: string;
  compoundname: string | null;
  row_count: number;
  file: string;
}

export interface AssetEntry {
  path: string;
  bytes: number;
  sha256: string;
}

export interface AssetManifest {
  version: string;
  generated_at: string;
  source_db: string;
  include_integrated_full: boolean;
  counts: {
    integrated_rows: number;
    compounds: number;
    genes: number;
    pathways: number;
    toxicity_rows: number;
    toxicity_compounds: number;
    toxicity_endpoints: number;
    invalid_ko: number;
    invalid_cpd: number;
    integrated_shards: number;
  };
  assets: AssetEntry[];
  integrated_shards: {
    index_file: string;
    directory: string;
    count: number;
  };
  phases: {
    phase_1: string[];
    phase_2: string[];
  };
}

export interface AssetMetadataResponse {
  available: boolean;
  version: string;
  basePath: string;
  manifest?: AssetManifest;
}

export type IntegratedTableShard = IntegratedData[];

export type AssetCatalog = {
  compound_summary: CompoundSummary[];
  gene_summary: GeneSummary[];
  pathway_summary: PathwaySummary[];
  toxicity_matrix: ToxicityMatrixRow[];
  network_graph: NetworkGraphData;
  sankey_data: SankeyDatum[];
};
