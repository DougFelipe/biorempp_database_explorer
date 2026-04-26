import { describe, expect, it } from 'vitest';
import { USER_GUIDE_CATALOG, parseUserGuideCatalog } from '@/config/userGuideCatalog';

const VALID_GUIDE_YAML = `
version: v1
page_title: User Guide
page_subtitle: test
intro_paragraphs:
  - intro
access_note: access
workflow:
  title: Workflow
  steps:
    - step
quick_nav:
  title: Quick Nav
  description: description
categories:
  - id: compounds
    label: Compounds
    eyebrow: Explorer
    summary: summary
    purpose: purpose
    capabilities:
      - capability
    filters:
      - filter
    outputs:
      - output
    detail_views:
      - detail
    best_for:
      - best
    cta_label: Open Compounds
    target_view: compounds
  - id: compound-classes
    label: Compound Classes
    eyebrow: Explorer
    summary: summary
    purpose: purpose
    capabilities:
      - capability
    filters:
      - filter
    outputs:
      - output
    detail_views:
      - detail
    best_for:
      - best
    cta_label: Open Classes
    target_view: compound-classes
  - id: genes
    label: Genes
    eyebrow: Explorer
    summary: summary
    purpose: purpose
    capabilities:
      - capability
    filters:
      - filter
    outputs:
      - output
    detail_views:
      - detail
    best_for:
      - best
    cta_label: Open Genes
    target_view: genes
  - id: pathways
    label: Pathways
    eyebrow: Explorer
    summary: summary
    purpose: purpose
    capabilities:
      - capability
    filters:
      - filter
    outputs:
      - output
    detail_views:
      - detail
    best_for:
      - best
    cta_label: Open Pathways
    target_view: pathways
  - id: toxicity
    label: Toxicity
    eyebrow: Explorer
    summary: summary
    purpose: purpose
    capabilities:
      - capability
    filters:
      - filter
    outputs:
      - output
    detail_views:
      - detail
    best_for:
      - best
    cta_label: Open Toxicity
    target_view: toxicity
  - id: guided-analysis
    label: Guided Analysis
    eyebrow: Workflow
    summary: summary
    purpose: purpose
    capabilities:
      - capability
    filters:
      - filter
    outputs:
      - output
    detail_views:
      - detail
    best_for:
      - best
    cta_label: Open Guided
    target_view: guided-analysis
closing_note: closing
`;

describe('userGuideCatalog', () => {
  it('loads the shipped YAML catalog successfully', () => {
    expect(USER_GUIDE_CATALOG.page_title).toBe('User Guide');
    expect(USER_GUIDE_CATALOG.categories).toHaveLength(6);
    expect(USER_GUIDE_CATALOG.categories[5].id).toBe('guided-analysis');
  });

  it('rejects a catalog with missing categories', () => {
    expect(() =>
      parseUserGuideCatalog(VALID_GUIDE_YAML.replace(/  - id: guided-analysis[\s\S]*?closing_note:/m, 'closing_note:'))
    ).toThrow(/exactly 6 categories/);
  });

  it('rejects duplicated category ids', () => {
    expect(() =>
      parseUserGuideCatalog(
        VALID_GUIDE_YAML.replace('  - id: compound-classes', '  - id: compounds')
      )
    ).toThrow(/duplicated id "compounds"/);
  });

  it('rejects invalid target views', () => {
    expect(() =>
      parseUserGuideCatalog(
        VALID_GUIDE_YAML.replace('target_view: guided-analysis', 'target_view: user-guide')
      )
    ).toThrow(/target_view/);
  });

  it('rejects empty required arrays inside categories', () => {
    expect(() =>
      parseUserGuideCatalog(
        VALID_GUIDE_YAML.replace('    outputs:\n      - output', '    outputs: []')
      )
    ).toThrow(/categories\[0\]\.outputs/);
  });
});
