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
