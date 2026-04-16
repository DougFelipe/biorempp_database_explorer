export type ContactSocialIcon = 'github' | 'linkedin' | 'instagram' | 'email';

export interface ContactLinkItem {
  id: string;
  label: string;
  url: string;
  icon: ContactSocialIcon;
}

export interface ContactLabSection {
  section_title: string;
  card_title: string;
  name: string;
  paragraphs: string[];
  logo_image_key: string;
}

export interface ContactTeamMember {
  id: string;
  name: string;
  role: string;
  description: string;
  image_key: string;
  additional_info?: string;
  badge_text?: string;
}

export interface ContactTeamSection {
  section_title: string;
  members: ContactTeamMember[];
}

export interface ContactGetInTouchSection {
  section_title: string;
  intro: string;
  email: string;
  social_title: string;
  social_links: ContactLinkItem[];
}

export interface ContactPageCatalog {
  version: string;
  language: string;
  page_title: string;
  page_subtitle: string;
  laboratory: ContactLabSection;
  team: ContactTeamSection;
  get_in_touch: ContactGetInTouchSection;
}
