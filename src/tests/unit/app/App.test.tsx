import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { FAQ_CATALOG } from '@/config/faqCatalog';

const {
  mockGetCompounds,
  mockGetPathwayOptions,
  mockGetUniqueCompoundClasses,
  mockGetUniqueGenes,
  mockGetUniqueReferenceAGs,
} = vi.hoisted(() => ({
  mockGetCompounds: vi.fn(),
  mockGetPathwayOptions: vi.fn(),
  mockGetUniqueCompoundClasses: vi.fn(),
  mockGetUniqueGenes: vi.fn(),
  mockGetUniqueReferenceAGs: vi.fn(),
}));

vi.mock('@/components/CompoundDetail', () => ({
  CompoundDetail: ({ cpd }: { cpd: string }) => <h2>Compound Detail {cpd}</h2>,
}));

vi.mock('@/components/GeneDetail', () => ({
  GeneDetail: ({ ko }: { ko: string }) => <h2>Gene Detail {ko}</h2>,
}));

vi.mock('@/components/GuidedAnalysisPage', () => ({
  GuidedAnalysisPage: () => <h2>Guided Analysis</h2>,
}));

vi.mock('@/features/compounds/api', () => ({
  exportCompoundsToCSV: vi.fn(),
  exportCompoundsToJSON: vi.fn(),
  getCompounds: mockGetCompounds,
}));

vi.mock('@/features/meta/api', () => ({
  getPathwayOptions: mockGetPathwayOptions,
  getUniqueCompoundClasses: mockGetUniqueCompoundClasses,
  getUniqueGenes: mockGetUniqueGenes,
  getUniqueReferenceAGs: mockGetUniqueReferenceAGs,
}));

describe('App shell navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    mockGetCompounds.mockResolvedValue({
      data: [
        {
          cpd: 'C00014',
          compoundname: 'Ammonia',
          compoundclass: 'Nitrogen-containing',
          gene_count: 327,
          genes: [],
          high_risk_endpoint_count: 2,
          ko_count: 334,
          pathway_count: 25,
          pathways: [],
          reference_ag: 'ATSDR; PSL',
          reference_count: 2,
          smiles: '[H]N([H])[H]',
          toxicity_risk_mean: 0.22,
          toxicity_scores: {},
          updated_at: '2026-04-05',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
    mockGetUniqueCompoundClasses.mockResolvedValue(['Nitrogen-containing']);
    mockGetUniqueReferenceAGs.mockResolvedValue(['ATSDR; PSL']);
    mockGetUniqueGenes.mockResolvedValue(['nahA']);
    mockGetPathwayOptions.mockResolvedValue([
      { pathway: 'Benzoate degradation', source: 'KEGG' },
    ]);
  });

  it('renders the home route and navigates to FAQ and Database Metrics', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'FAQ' }));
    expect(screen.getByRole('heading', { name: FAQ_CATALOG.title })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/faq');

    await user.click(screen.getByRole('button', { name: 'Database Metrics' }));
    expect(screen.getByRole('heading', { name: 'Database Metrics' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/database-metrics');
  });

  it('honors the current route on initial render', () => {
    window.history.replaceState({}, '', '/database-metrics');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Database Metrics' })).toBeInTheDocument();
  });

  it('renders the compounds route from the current location', async () => {
    window.history.replaceState({}, '', '/compounds');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Compound Explorer' })).toBeInTheDocument();
    expect(await screen.findByText('Ammonia')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'C00014' })).toBeInTheDocument();
  });

  it('renders compound and gene detail routes from the current location', async () => {
    window.history.replaceState({}, '', '/compounds/C00014');
    const firstRender = render(<App />);

    expect(await screen.findByRole('heading', { name: 'Compound Detail C00014' })).toBeInTheDocument();

    firstRender.unmount();
    window.history.replaceState({}, '', '/genes/K00001');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Gene Detail K00001' })).toBeInTheDocument();
  });

  it('renders the guided analysis route from the current location', () => {
    window.history.replaceState({}, '', '/guided-analysis');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Guided Analysis' })).toBeInTheDocument();
  });
});
