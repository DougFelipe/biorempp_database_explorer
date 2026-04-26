import type { View } from './routes';
import { HOME_EDITORIAL_CATALOG } from '../config/homeCatalog';

export interface AppNavigationItem {
  id: string;
  label: string;
  view: View;
}

export const APP_BRAND = {
  title: 'BioRemPP Database Explorer',
  subtitle: 'Integrated bioremediation and toxicological data exploration',
};

export const APP_PRIMARY_NAV: AppNavigationItem[] = [
  { id: 'database-metrics', label: 'Database Metrics', view: 'database-metrics' },
  { id: 'user-guide', label: 'User Guide', view: 'user-guide' },
  { id: 'faq', label: 'FAQ', view: 'faq' },
  { id: 'contact', label: 'Contact', view: 'contact' },
  { id: 'documentation', label: 'Documentation', view: 'database-metrics' },
];

export const APP_FOOTER_TEXT = HOME_EDITORIAL_CATALOG.footer.content;
