export interface ExternalDownloadItem {
  id: string;
  label: string;
  format: string;
  url: string;
  version: string;
  size?: string;
  updated_at?: string;
  source: string;
}

export interface ExternalDownloadCatalog {
  version: string;
  title: string;
  note?: string;
  items: ExternalDownloadItem[];
}

export interface GuidedQueryRecipe {
  button_label: string;
  title: string;
  introduction: string;
  sqlite: {
    description: string;
    query: string;
  };
  python: {
    description: string;
    script: string;
  };
  notes?: string[];
}

export interface GuidedQueryRecipeCatalog {
  version: string;
  note?: string;
  queries: Record<string, GuidedQueryRecipe>;
}

export interface MetricCardItem {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export interface NamedCountItem {
  name: string;
  count: number;
}

export interface ColumnCompletenessItem {
  column: string;
  completeness_pct: number;
  missing_count: number;
}

export interface LinkMatchSummary {
  ko_total: number;
  ko_matched: number;
  ko_unmatched: number;
  cpd_total: number;
  cpd_matched: number;
  cpd_unmatched: number;
}

export interface RowShapeSummary {
  dense: number;
  ec_only: number;
  reaction_only: number;
  both_na: number;
}

export interface ReactionCoverageSummary {
  with_reaction_rows: number;
  with_reaction_description_rows: number;
  unmatched_reaction_id_count: number;
}

export interface DatabaseSchemaSnapshot {
  id: string;
  database: string;
  version: string;
  rows: number;
  columns: number;
  focus: string;
  join_key: string;
  source_doc: string;
  core_columns: string[];
}

export interface DatabaseMetricsCatalog {
  metrics_source_label: string;
  schema_reference_label: string;
  database_name: string;
  database_version: string;
  generation_date: string;
  core_metrics: MetricCardItem[];
  highlight_metrics: MetricCardItem[];
  top_compound_classes: NamedCountItem[];
  top_agencies: NamedCountItem[];
  top_genes: NamedCountItem[];
  top_kos: NamedCountItem[];
  top_enzymes: NamedCountItem[];
  column_completeness: ColumnCompletenessItem[];
  link_match: LinkMatchSummary;
  row_shapes: RowShapeSummary;
  reaction_coverage: ReactionCoverageSummary;
  schemas: DatabaseSchemaSnapshot[];
}
