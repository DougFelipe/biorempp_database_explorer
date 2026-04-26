import { describe, expect, it } from 'vitest';
import { HOME_EDITORIAL_CATALOG, parseHomeEditorialCatalog } from '@/config/homeCatalog';

describe('homeCatalog', () => {
  it('loads the shipped YAML catalog successfully', () => {
    expect(HOME_EDITORIAL_CATALOG.hero.title).toBe('BioRemPP Database Explorer');
    expect(HOME_EDITORIAL_CATALOG.browse_section.items.length).toBeGreaterThan(0);
    expect(HOME_EDITORIAL_CATALOG.guided_analysis.panels.length).toBe(4);
  });

  it('rejects required empty fields', () => {
    expect(() =>
      parseHomeEditorialCatalog(`
version: v1
hero:
  title: ""
  subtitle: test
  description:
    - test
  access_statement: test
  highlights:
    - label: Access
      value: Free
      hint: test
scientific_overview:
  title: Scientific Overview
  content:
    - test
data_sources:
  title: Data Sources
  items:
    - source
target_users:
  title: Target Users
  items:
    - user
browse_section:
  title: Browse by Category
  description: test
  items:
    - id: compounds
      label: Compounds
      description: test
guided_analysis:
  title: Guided Analysis
  description:
    - test
  cta_label: Launch Analysis
  panels:
    - title: Panel
      bullets:
        - bullet
  scope_note: note
downloads:
  title: Database Downloads
  description:
    - test
  primary_title: Primary
  primary_description: test
  accordion_title: Other
  accordion_description: test
  disclaimer_title: Download notice
  disclaimer_paragraphs:
    - test
  selected_release_prefix: Selected release
  open_release_label: Open release
  close_label: Close
snapshot:
  title: Database Snapshot
  description: test
  action_label: View metrics
limitations:
  title: Scope and Limitations
  content:
    - test
footer:
  content: test
`)
    ).toThrow(/hero.title/);
  });

  it('rejects empty browse section items', () => {
    expect(() =>
      parseHomeEditorialCatalog(`
version: v1
hero:
  title: BioRemPP Database Explorer
  subtitle: test
  description:
    - test
  access_statement: test
  highlights:
    - label: Access
      value: Free
      hint: test
scientific_overview:
  title: Scientific Overview
  content:
    - test
data_sources:
  title: Data Sources
  items:
    - source
target_users:
  title: Target Users
  items:
    - user
browse_section:
  title: Browse by Category
  description: test
  items: []
guided_analysis:
  title: Guided Analysis
  description:
    - test
  cta_label: Launch Analysis
  panels:
    - title: Panel
      bullets:
        - bullet
  scope_note: note
downloads:
  title: Database Downloads
  description:
    - test
  primary_title: Primary
  primary_description: test
  accordion_title: Other
  accordion_description: test
  disclaimer_title: Download notice
  disclaimer_paragraphs:
    - test
  selected_release_prefix: Selected release
  open_release_label: Open release
  close_label: Close
snapshot:
  title: Database Snapshot
  description: test
  action_label: View metrics
limitations:
  title: Scope and Limitations
  content:
    - test
footer:
  content: test
`)
    ).toThrow(/browse_section.items/);
  });

  it('rejects duplicated browse ids', () => {
    expect(() =>
      parseHomeEditorialCatalog(`
version: v1
hero:
  title: BioRemPP Database Explorer
  subtitle: test
  description:
    - test
  access_statement: test
  highlights:
    - label: Access
      value: Free
      hint: test
scientific_overview:
  title: Scientific Overview
  content:
    - test
data_sources:
  title: Data Sources
  items:
    - source
target_users:
  title: Target Users
  items:
    - user
browse_section:
  title: Browse by Category
  description: test
  items:
    - id: compounds
      label: Compounds
      description: test
    - id: compounds
      label: Compounds Copy
      description: test
guided_analysis:
  title: Guided Analysis
  description:
    - test
  cta_label: Launch Analysis
  panels:
    - title: Panel
      bullets:
        - bullet
  scope_note: note
downloads:
  title: Database Downloads
  description:
    - test
  primary_title: Primary
  primary_description: test
  accordion_title: Other
  accordion_description: test
  disclaimer_title: Download notice
  disclaimer_paragraphs:
    - test
  selected_release_prefix: Selected release
  open_release_label: Open release
  close_label: Close
snapshot:
  title: Database Snapshot
  description: test
  action_label: View metrics
limitations:
  title: Scope and Limitations
  content:
    - test
footer:
  content: test
`)
    ).toThrow(/duplicated browse section id/);
  });

  it('rejects invalid browse ids outside the allowed app views', () => {
    expect(() =>
      parseHomeEditorialCatalog(`
version: v1
hero:
  title: BioRemPP Database Explorer
  subtitle: test
  description:
    - test
  access_statement: test
  highlights:
    - label: Access
      value: Free
      hint: test
scientific_overview:
  title: Scientific Overview
  content:
    - test
data_sources:
  title: Data Sources
  items:
    - source
target_users:
  title: Target Users
  items:
    - user
browse_section:
  title: Browse by Category
  description: test
  items:
    - id: database-metrics
      label: Metrics
      description: test
guided_analysis:
  title: Guided Analysis
  description:
    - test
  cta_label: Launch Analysis
  panels:
    - title: Panel
      bullets:
        - bullet
  scope_note: note
downloads:
  title: Database Downloads
  description:
    - test
  primary_title: Primary
  primary_description: test
  accordion_title: Other
  accordion_description: test
  disclaimer_title: Download notice
  disclaimer_paragraphs:
    - test
  selected_release_prefix: Selected release
  open_release_label: Open release
  close_label: Close
snapshot:
  title: Database Snapshot
  description: test
  action_label: View metrics
limitations:
  title: Scope and Limitations
  content:
    - test
footer:
  content: test
`)
    ).toThrow(/browse_section.items\[0\].id/);
  });
});
