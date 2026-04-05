export interface IntegratedData {
  id: number;
  ko: string | null;
  genesymbol: string | null;
  genename: string | null;
  enzyme_activity: string | null;
  ec: string | null;
  reaction: string | null;
  reaction_description: string | null;
  cpd: string | null;
  compoundname: string | null;
  compoundclass: string | null;
  reference_ag: string | null;
  pathway_hadeg: string | null;
  pathway_kegg: string | null;
  compound_pathway: string | null;
  smiles: string | null;
  chebi: string | null;
  toxicity_labels: Record<string, unknown>;
  toxicity_values: Record<string, unknown>;
  created_at: string;
}

export interface CompoundSummary {
  cpd: string;
  compoundname: string | null;
  compoundclass: string | null;
  reference_ag: string | null;
  ko_count: number;
  gene_count: number;
  pathway_count: number;
  toxicity_risk_mean: number | null;
  toxicity_scores: Record<string, number | null>;
  smiles: string | null;
  genes: string[];
  pathways: string[];
  updated_at: string;
}

export interface CompoundMetadataSource {
  name: string;
  role: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | string;
}

export interface CompoundMetadata {
  identifiers: {
    cpd: string;
    compound_name: string | null;
    compound_class: string | null;
    ko_ids: string[];
    gene_symbols: string[];
    gene_names: string[];
    chebi_id: string | null;
    smiles: string | null;
  };
  functional_annotation: {
    enzyme_activity: string[];
    ec_numbers: string[];
    pathways_hadeg: string[];
    pathways_kegg: string[];
    compound_pathway_class: string[];
    reaction_count: number;
  };
  chemical_information: {
    compound_name: string | null;
    compound_class: string | null;
    smiles: string | null;
    chebi: string | null;
  };
  data_sources: CompoundMetadataSource[];
  provenance: {
    version: string;
    last_updated: string | null;
    pipeline: string;
  };
  cross_references: {
    kegg_compound_id: string;
    chebi: string | null;
    ec_numbers: string[];
    reaction_count: number;
  };
  data_quality: {
    ko_format_valid: boolean;
    cpd_format_valid: boolean;
    completeness_pct: number;
    cross_references_coverage: string;
  };
}

export interface GeneSummary {
  ko: string;
  genesymbol: string | null;
  genename: string | null;
  compound_count: number;
  pathway_count: number;
  enzyme_activities: string[];
  updated_at: string;
}

export interface PathwaySummary {
  pathway: string;
  source: string;
  compound_count: number;
  gene_count: number;
  updated_at: string;
}

export interface CompoundFilters {
  compoundclass?: string;
  reference_ag?: string;
  pathway_source?: string;
  pathway?: string;
  gene?: string;
  ko_count_min?: number;
  ko_count_max?: number;
  gene_count_min?: number;
  gene_count_max?: number;
  search?: string;
}

export interface GeneFilters {
  genesymbol?: string;
  compound_count_min?: number;
  compound_count_max?: number;
  search?: string;
}

export interface PathwayFilters {
  source?: string;
  search?: string;
}

export interface ToxicityEndpoint {
  cpd: string;
  compoundname: string | null;
  compoundclass: string | null;
  endpoint: string;
  label: string | null;
  value: number | null;
  updated_at: string;
}

export interface CompoundGeneCardRow {
  cpd: string;
  ko: string;
  genesymbol: string;
  genename: string;
  enzyme_activity: string;
  ec: string;
  reaction_descriptions: string[];
  reaction_descriptions_total: number;
  supporting_rows: number;
  updated_at: string;
}

export interface CompoundPathwayCardRow {
  cpd: string;
  source: 'HADEG' | 'KEGG' | 'COMPOUND_PATHWAY' | string;
  pathway: string;
  supporting_rows: number;
  updated_at: string;
}

export interface PathwayOption {
  pathway: string;
  source: string;
}

export interface ToxicityFilters {
  endpoint?: string;
  label?: string;
  compoundclass?: string;
  value_min?: number;
  value_max?: number;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
