export interface CompoundSummary {
  cpd: string;
  compoundname: string | null;
  compoundclass: string | null;
  reference_ag: string | null;
  reference_count: number;
  ko_count: number;
  gene_count: number;
  pathway_count: number;
  toxicity_risk_mean: number | null;
  high_risk_endpoint_count: number;
  toxicity_scores: Record<string, number | null>;
  smiles: string | null;
  genes: string[];
  pathways: string[];
  updated_at: string;
}

export interface CompoundOverviewSummary {
  cpd: string;
  compoundname: string | null;
  compoundclass: string | null;
  reference_count: number;
  ko_count: number;
  gene_count: number;
  pathway_count: number;
  toxicity_risk_mean: number | null;
  high_risk_endpoint_count: number;
}

export interface KoBarDatum {
  ko: string;
  count: number;
  relation_count_hadeg: number;
  relation_count_kegg: number;
}

export interface PathwayTopDatum {
  source: string;
  pathway: string;
  supporting_rows: number;
}

export interface PathwayCoverageCell {
  source: string;
  pathway: string;
  present: number;
  weight: number;
}

export interface PathwayCoverageMatrix {
  sources: string[];
  pathways: string[];
  cells: PathwayCoverageCell[];
}

export type ToxicityRiskBucket = 'low_risk' | 'medium_risk' | 'high_risk' | 'unknown';

export interface ToxicityHeatmapDatum {
  endpoint: string;
  label: string | null;
  value: number | null;
  risk_bucket: ToxicityRiskBucket;
}

export interface CompoundOverviewResponse {
  cpd: string;
  limits: {
    top_ko: number;
    top_pathways: number;
  };
  summary: CompoundOverviewSummary;
  ko_bar: KoBarDatum[];
  pathways_top_kegg: PathwayTopDatum[];
  pathways_top_hadeg: PathwayTopDatum[];
  pathway_coverage: PathwayCoverageMatrix;
  metric_basis: {
    ko_bar: string;
    pathways_top_kegg: string;
    pathways_top_hadeg: string;
    pathway_coverage_weight: string;
  };
  toxicity_heatmap: ToxicityHeatmapDatum[];
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

export interface GeneDetailSummary {
  ko: string;
  genesymbol: string | null;
  genename: string | null;
  compound_count: number;
  pathway_count: number;
  enzyme_activities: string[];
  compound_class_count: number;
  reference_agency_count: number;
  toxicity_coverage_pct: number | null;
  updated_at: string;
}

export interface GeneAssociatedCompoundRow {
  cpd: string;
  compoundname: string | null;
  compoundclass: string | null;
  reference_ag: string | null;
  reference_count: number;
  ko_count: number;
  gene_count: number;
  pathway_count: number;
  toxicity_risk_mean: number | null;
  high_risk_endpoint_count: number;
  smiles: string | null;
  updated_at: string;
}

export interface GeneMetadataSource {
  name: string;
  role: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | string;
}

export interface GeneMetadataChebiItem {
  id: string;
  compound_name: string | null;
}

export interface GeneMetadataSmilesItem {
  value: string;
  compound_name: string | null;
}

export interface GeneMetadataReactionItem {
  id: string;
  description: string | null;
}

export interface GeneMetadata {
  identifiers: {
    ko: string;
    gene_symbol: string | null;
    gene_name: string | null;
    kegg_ko_id: string;
    ec_numbers: string[];
    chebi_ids: string[];
    smiles: string[];
    reaction_ids: string[];
    chebi_items: GeneMetadataChebiItem[];
    smiles_items: GeneMetadataSmilesItem[];
    reaction_items: GeneMetadataReactionItem[];
  };
  data_sources: GeneMetadataSource[];
  quantitative_overview: {
    linked_compounds: number;
    compound_classes: number;
    pathway_annotations: number;
    pathways_hadeg: number;
    pathways_kegg: number;
    pathways_compound_pathway: number;
    ec_count: number;
    enzyme_activity_count: number;
    reference_agencies: number;
    toxicity_coverage_pct: number | null;
    reaction_id_count: number;
  };
}

export interface PathwaySummary {
  pathway: string;
  source: string;
  compound_count: number;
  gene_count: number;
  updated_at: string;
}

export interface CompoundClassSummary {
  compoundclass: string;
  compound_count: number;
  ko_count: number;
  gene_count: number;
  pathway_count: number;
  updated_at: string | null;
}

export interface CompoundClassOverviewSummary {
  compoundclass: string;
  ko_count: number;
  gene_count: number;
  compound_count: number;
  reaction_ec_count: number;
  pathway_count: number;
  source_count: number;
  toxicity_coverage_pct: number | null;
}

export interface PathwayOverviewSummary {
  pathway: string;
  selected_source: string;
  ko_count: number;
  gene_count: number;
  compound_count: number;
  reaction_ec_count: number;
  source_count: number;
  ko_overlap_pct: number | null;
}

export interface PathwayKoDistributionDatum {
  ko: string;
  count: number;
}

export interface PathwayGeneDistributionDatum {
  gene: string;
  count: number;
}

export interface PathwayEcClassDistributionDatum {
  ec_class: string;
  count: number;
}

export interface PathwayToxicityMatrixCompound {
  cpd: string;
  compoundname: string | null;
}

export interface PathwayToxicityMatrixCell {
  cpd: string;
  endpoint: string;
  label: string | null;
  value: number | null;
  risk_bucket: ToxicityRiskBucket;
}

export interface PathwayToxicityMatrix {
  compounds: PathwayToxicityMatrixCompound[];
  endpoints: string[];
  cells: PathwayToxicityMatrixCell[];
}

export interface PathwayDetailOverviewResponse {
  pathway: string;
  available_sources: string[];
  selected_source: string;
  summary: PathwayOverviewSummary;
  ko_distribution: PathwayKoDistributionDatum[];
  gene_distribution: PathwayGeneDistributionDatum[];
  ec_class_distribution: PathwayEcClassDistributionDatum[];
  toxicity_matrix: PathwayToxicityMatrix;
}

export interface CompoundClassDetailOverviewResponse {
  compoundclass: string;
  summary: CompoundClassOverviewSummary;
  ko_distribution: PathwayKoDistributionDatum[];
  gene_distribution: PathwayGeneDistributionDatum[];
  ec_class_distribution: PathwayEcClassDistributionDatum[];
  toxicity_matrix: PathwayToxicityMatrix;
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

export interface CompoundClassFilters {
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
