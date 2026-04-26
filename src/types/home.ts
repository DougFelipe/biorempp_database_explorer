import type { View } from '../app/routes';

export type HomeBrowseViewId = Extract<
  View,
  'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis'
>;

export interface HomeMetricHighlight {
  label: string;
  value: string;
  hint: string;
}

export interface HomeHeroContent {
  title: string;
  subtitle: string;
  description: string[];
  access_statement: string;
  highlights: HomeMetricHighlight[];
}

export interface HomeSectionTextBlock {
  eyebrow?: string;
  title: string;
  content: string[];
}

export interface HomeBulletSection {
  eyebrow?: string;
  title: string;
  items: string[];
  footer?: string;
}

export interface HomeBrowseItem {
  id: HomeBrowseViewId;
  label: string;
  description: string;
}

export interface HomeBrowseSection {
  eyebrow?: string;
  title: string;
  description: string;
  items: HomeBrowseItem[];
}

export interface HomePanelGroup {
  title: string;
  bullets: string[];
}

export interface HomeGuidedAnalysisSection {
  eyebrow?: string;
  title: string;
  description: string[];
  cta_label: string;
  panels: HomePanelGroup[];
  scope_note: string;
}

export interface HomeDownloadsSection {
  eyebrow?: string;
  title: string;
  description: string[];
  primary_title: string;
  primary_description: string;
  accordion_title: string;
  accordion_description: string;
  disclaimer_title: string;
  disclaimer_paragraphs: string[];
  selected_release_prefix: string;
  open_release_label: string;
  close_label: string;
}

export interface HomeSnapshotSection {
  eyebrow?: string;
  title: string;
  description: string;
  action_label: string;
}

export interface HomeFooterContent {
  content: string;
}

export interface HomeEditorialCatalog {
  version: string;
  hero: HomeHeroContent;
  scientific_overview: HomeSectionTextBlock;
  data_sources: HomeBulletSection;
  target_users: HomeBulletSection;
  browse_section: HomeBrowseSection;
  guided_analysis: HomeGuidedAnalysisSection;
  downloads: HomeDownloadsSection;
  snapshot: HomeSnapshotSection;
  limitations: HomeSectionTextBlock;
  footer: HomeFooterContent;
}
