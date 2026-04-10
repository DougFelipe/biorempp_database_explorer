import type { HorizontalBarItem } from '../components/charts/HorizontalBarChart';

export type GuidedFilterType = 'select' | 'number_range' | 'search' | 'dependent_select' | 'toggle';
export type GuidedProviderType = 'meta_endpoint' | 'static' | 'query_derived';
export type GuidedVisualizationType = 'horizontal_bar' | 'scatter_quadrant' | 'heatmap_matrix' | 'table';
export type GuidedTableColumnType = 'text' | 'number' | 'compound_link';

export interface GuidedCategory {
  id: string;
  label: string;
}

export interface GuidedFilterProviderOption {
  value: string;
  label: string;
}

export interface GuidedFilterProvider {
  type: GuidedProviderType;
  endpoint?: string;
  source?: string;
  include_mean_option?: boolean;
  mean_option_label?: string;
  options?: GuidedFilterProviderOption[];
}

export interface GuidedFilterDefinition {
  id: string;
  type: GuidedFilterType;
  label: string;
  placeholder?: string;
  depends_on?: string;
  min?: number;
  max?: number;
  step?: number;
  provider?: GuidedFilterProvider;
}

export interface GuidedSummaryCardDefinition {
  id: string;
  label: string;
  value_key: string;
  hint?: string;
}

export interface GuidedVisualizationDefinition {
  id: string;
  type: GuidedVisualizationType;
  title: string;
  subtitle?: string;
  data_key: string;
}

export interface GuidedTableColumnDefinition {
  id: string;
  label: string;
  type: GuidedTableColumnType;
}

export interface GuidedTableDefinition {
  id: string;
  title: string;
  subtitle?: string;
  row_click_field?: string;
  empty_message?: string;
  columns: GuidedTableColumnDefinition[];
}

export interface GuidedInsightDefinition {
  id: string;
  text: string;
}

export interface GuidedQueryDefinition {
  id: string;
  category: string;
  title: string;
  question: string;
  description: string;
  dataset: string;
  executor: string;
  defaults: Record<string, unknown>;
  executor_config: Record<string, unknown>;
  filters: GuidedFilterDefinition[];
  summary_cards: GuidedSummaryCardDefinition[];
  visualizations: GuidedVisualizationDefinition[];
  table: GuidedTableDefinition | null;
  insights: GuidedInsightDefinition[];
}

export interface GuidedCatalogResponse {
  version: string;
  title: string;
  categories: GuidedCategory[];
  queries: GuidedQueryDefinition[];
  generated_at: string | null;
}

export interface GuidedFilterOption {
  value: string;
  label: string;
  group_key?: string;
  group_title?: string;
}

export interface GuidedQueryOptionsResponse {
  query_id: string;
  options: Record<string, GuidedFilterOption[]>;
}

export interface GuidedQuadrantCounts {
  top_right: number;
  top_left: number;
  bottom_right: number;
  bottom_left: number;
}

export type GuidedQuadrantId = keyof GuidedQuadrantCounts;

export interface GuidedScatterPoint {
  cpd: string;
  compoundname: string | null;
  compoundclass: string | null;
  gene_count: number;
  ko_count: number;
  pathway_count: number;
  toxicity_risk_mean: number | null;
  y_value: number;
  quadrant: GuidedQuadrantId;
}

export interface GuidedScatterVisualizationData {
  points: GuidedScatterPoint[];
  x_threshold: number;
  y_threshold: number;
  x_field: string;
  y_field: string;
  y_metric_label: string;
  endpoint: string;
}

export interface GuidedHorizontalBarVisualizationData {
  items: HorizontalBarItem[];
  empty_message: string;
}

export type GuidedVisualizationData =
  | GuidedHorizontalBarVisualizationData
  | GuidedScatterVisualizationData
  | Record<string, unknown>
  | null;

export interface GuidedSummaryCardResult {
  id: string;
  label: string;
  value: string | number | null;
  hint: string | null;
}

export interface GuidedVisualizationResult {
  id: string;
  type: GuidedVisualizationType;
  title: string;
  subtitle: string | null;
  data_key: string;
  data: GuidedVisualizationData;
}

export interface GuidedTableResult extends GuidedTableDefinition {
  rows: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GuidedExecutionMeta {
  query_id: string;
  dataset: string;
  version: string;
  execution_ms: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  excluded_null_y?: number;
  points_count?: number;
  quadrant_counts?: GuidedQuadrantCounts;
  y_metric_key?: string;
  y_metric_label?: string;
  x_threshold?: number;
  y_threshold?: number;
  focus_cluster?: boolean;
  gene_p95?: number | null;
}

export interface GuidedExecutionResponse {
  meta: GuidedExecutionMeta;
  summary_cards: GuidedSummaryCardResult[];
  visualizations: GuidedVisualizationResult[];
  table: GuidedTableResult | null;
  insights: GuidedInsightDefinition[];
  filters_applied: Record<string, unknown>;
}

export interface GuidedExecuteRequest {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

export type GuidedFilterValue =
  | string
  | boolean
  | {
      min?: number;
      max?: number;
    };

export type GuidedFilterState = Record<string, GuidedFilterValue>;

