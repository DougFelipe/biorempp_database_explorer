import { describe, expect, it } from 'vitest';
import { HOME_EDITORIAL_CATALOG, parseHomeEditorialCatalog } from '@/config/homeCatalog';

const VALID_HOME_YAML = `
version: v1
hero:
  title: BioRemPP Database Explorer
  subtitle: test
  description:
    - paragraph 1
    - paragraph 2
    - paragraph 3
  access_statement: open access
  notice_lines:
    - notice 1
    - notice 2
  cta_buttons:
    - id: launch-analysis
      label: Launch Analysis
      variant: default
    - id: how-to-cite
      label: How to Cite
      variant: success
    - id: terms-of-use
      label: Terms of Use
      variant: warning
  modals:
    terms_of_use:
      title: Terms
      description: test
      paragraphs:
        - test
    how_to_cite:
      title: Cite
      description: test
      paragraphs:
        - test
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
`;

describe('homeCatalog', () => {
  it('loads the shipped YAML catalog successfully', () => {
    expect(HOME_EDITORIAL_CATALOG.hero.title).toBe('BioRemPP Database Explorer');
    expect(HOME_EDITORIAL_CATALOG.hero.description).toHaveLength(3);
    expect(HOME_EDITORIAL_CATALOG.hero.cta_buttons).toHaveLength(3);
    expect(HOME_EDITORIAL_CATALOG.hero.cta_buttons.map((button) => button.id)).toEqual([
      'launch-analysis',
      'how-to-cite',
      'terms-of-use',
    ]);
    expect(HOME_EDITORIAL_CATALOG.browse_section.items.length).toBeGreaterThan(0);
    expect(HOME_EDITORIAL_CATALOG.guided_analysis.panels.length).toBe(4);
  });

  it('rejects required empty fields', () => {
    expect(() =>
      parseHomeEditorialCatalog(VALID_HOME_YAML.replace('title: BioRemPP Database Explorer', 'title: ""'))
    ).toThrow(/hero.title/);
  });

  it('rejects hero descriptions with fewer than three paragraphs', () => {
    expect(() =>
      parseHomeEditorialCatalog(
        VALID_HOME_YAML.replace(
          '  description:\n    - paragraph 1\n    - paragraph 2\n    - paragraph 3',
          '  description:\n    - paragraph 1\n    - paragraph 2'
        )
      )
    ).toThrow(/hero.description/);
  });

  it('rejects empty browse section items', () => {
    expect(() =>
      parseHomeEditorialCatalog(
        VALID_HOME_YAML.replace(
          'browse_section:\n  title: Browse by Category\n  description: test\n  items:\n    - id: compounds\n      label: Compounds\n      description: test',
          'browse_section:\n  title: Browse by Category\n  description: test\n  items: []'
        )
      )
    ).toThrow(/browse_section.items/);
  });

  it('rejects duplicated hero cta ids', () => {
    expect(() =>
      parseHomeEditorialCatalog(
        VALID_HOME_YAML.replace(
          '    - id: terms-of-use\n      label: Terms of Use\n      variant: warning',
          '    - id: how-to-cite\n      label: Terms Copy\n      variant: warning'
        )
      )
    ).toThrow(/duplicated id/);
  });

  it('rejects hero ctas out of order', () => {
    expect(() =>
      parseHomeEditorialCatalog(
        VALID_HOME_YAML.replace(
          '  cta_buttons:\n    - id: launch-analysis\n      label: Launch Analysis\n      variant: default\n    - id: how-to-cite\n      label: How to Cite\n      variant: success\n    - id: terms-of-use\n      label: Terms of Use\n      variant: warning',
          '  cta_buttons:\n    - id: how-to-cite\n      label: How to Cite\n      variant: success\n    - id: launch-analysis\n      label: Launch Analysis\n      variant: default\n    - id: terms-of-use\n      label: Terms of Use\n      variant: warning'
        )
      )
    ).toThrow(/expected "launch-analysis" at index 0/);
  });

  it('rejects missing modal content', () => {
    expect(() =>
      parseHomeEditorialCatalog(
        VALID_HOME_YAML.replace('      title: Cite', '      title: ""')
      )
    ).toThrow(/hero.modals.how_to_cite.title/);
  });
});
