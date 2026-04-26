import type { View } from '../app/routes';

export type UserGuideCategoryId =
  | 'compounds'
  | 'compound-classes'
  | 'genes'
  | 'pathways'
  | 'toxicity'
  | 'guided-analysis';

export type UserGuideTargetView = Extract<View, UserGuideCategoryId>;

export interface UserGuideWorkflowSection {
  title: string;
  steps: string[];
}

export interface UserGuideQuickNavSection {
  title: string;
  description: string;
}

export interface UserGuideCategorySection {
  id: UserGuideCategoryId;
  label: string;
  eyebrow: string;
  summary: string;
  purpose: string;
  capabilities: string[];
  filters: string[];
  outputs: string[];
  detail_views: string[];
  best_for: string[];
  cta_label: string;
  target_view: UserGuideTargetView;
}

export interface UserGuideCatalog {
  version: string;
  page_title: string;
  page_subtitle: string;
  intro_paragraphs: string[];
  access_note: string;
  workflow: UserGuideWorkflowSection;
  quick_nav: UserGuideQuickNavSection;
  categories: UserGuideCategorySection[];
  closing_note: string;
}
