export interface IntegratedData {
  id: number;
  ko: string | null;
  genesymbol: string | null;
  genename: string | null;
  enzyme_activity: string | null;
  ec: string | null;
  reaction: string | null;
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
  toxicity_score: number;
  smiles: string | null;
  genes: string[];
  pathways: string[];
  updated_at: string;
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
  pathway?: string;
  gene?: string;
  toxicity_score_min?: number;
  toxicity_score_max?: number;
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
