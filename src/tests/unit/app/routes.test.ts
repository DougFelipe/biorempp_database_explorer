import { describe, expect, it } from 'vitest';
import {
  buildCompoundClassPath,
  buildCompoundPath,
  buildGenePath,
  buildPathwayPath,
  getLegacyRedirectPath,
  getViewPath,
  parseRoute,
} from '../../../app/routes';

describe('app routes', () => {
  it('parses primary views and detail routes', () => {
    expect(parseRoute('/')).toEqual({ kind: 'view', view: 'home' });
    expect(parseRoute('/user-guide')).toEqual({ kind: 'view', view: 'user-guide' });
    expect(parseRoute('/faq')).toEqual({ kind: 'view', view: 'faq' });
    expect(parseRoute('/database-metrics')).toEqual({ kind: 'view', view: 'database-metrics' });
    expect(parseRoute('/compounds/C00014')).toEqual({ kind: 'compound', cpd: 'C00014' });
    expect(parseRoute('/genes/k00001')).toEqual({ kind: 'gene', ko: 'K00001' });
    expect(parseRoute('/compound-classes/detail/Aromatic')).toEqual({
      kind: 'compoundClass',
      compoundclass: 'Aromatic',
    });
    expect(parseRoute('/pathways/detail/KEGG/Benzoate%20degradation')).toEqual({
      kind: 'pathway',
      pathway: 'Benzoate degradation',
      source: 'KEGG',
    });
  });

  it('keeps the legacy guided-analysis alias and path builders stable', () => {
    expect(parseRoute('/visualizations')).toEqual({ kind: 'view', view: 'guided-analysis' });
    expect(getLegacyRedirectPath('/visualizations')).toBe('/guided-analysis');
    expect(getViewPath('user-guide')).toBe('/user-guide');
    expect(buildCompoundPath('C00014')).toBe('/compounds/C00014');
    expect(buildGenePath('K00001')).toBe('/genes/K00001');
    expect(buildCompoundClassPath('Aromatic')).toBe('/compound-classes/detail/Aromatic');
    expect(buildPathwayPath('Benzoate degradation', 'KEGG')).toBe('/pathways/detail/KEGG/Benzoate%20degradation');
    expect(buildPathwayPath('Benzoate degradation', 'ALL')).toBe('/pathways/detail/Benzoate%20degradation');
  });
});
