export type FaqNoteType = 'info' | 'warning' | 'success';

export interface FaqLink {
  label: string;
  url: string;
}

export interface FaqNote {
  type: FaqNoteType;
  text: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  bullets?: string[];
  note?: FaqNote;
  links?: FaqLink[];
  code_example?: string;
  tags?: string[];
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqItem[];
}

export interface FaqCatalog {
  version: string;
  language: string;
  title: string;
  intro: string;
  sections: FaqSection[];
}
