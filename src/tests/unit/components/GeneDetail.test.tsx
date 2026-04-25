import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneDetail } from '@/components/GeneDetail';

const {
  mockGetGeneAssociatedCompounds,
  mockGetGeneByKo,
  mockGetGeneDetailOverview,
  mockGetGeneMetadata,
} = vi.hoisted(() => ({
  mockGetGeneAssociatedCompounds: vi.fn(),
  mockGetGeneByKo: vi.fn(),
  mockGetGeneDetailOverview: vi.fn(),
  mockGetGeneMetadata: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  getGeneAssociatedCompounds: mockGetGeneAssociatedCompounds,
  getGeneByKo: mockGetGeneByKo,
  getGeneDetailOverview: mockGetGeneDetailOverview,
  getGeneMetadata: mockGetGeneMetadata,
}));

vi.mock('@/components/GeneOverviewTab', () => ({
  GeneOverviewTab: ({ overview }: { overview: { ko: string } }) => <div>Gene Overview {overview.ko}</div>,
}));

vi.mock('@/components/GeneMetadataPanel', () => ({
  GeneMetadataPanel: ({ metadata }: { metadata: { identifiers: { ko: string } } }) => (
    <div>Gene Metadata {metadata.identifiers.ko}</div>
  ),
}));

describe('GeneDetail', () => {
  beforeEach(() => {
    mockGetGeneByKo.mockResolvedValue({
      ko: 'K00001',
      genesymbol: 'nahA',
      genename: 'Naphthalene dioxygenase alpha subunit',
      compound_count: 2,
      pathway_count: 4,
      enzyme_activities: ['dioxygenase'],
      compound_class_count: 3,
      reference_agency_count: 2,
      toxicity_coverage_pct: 50,
      updated_at: '2026-04-05',
    });

    mockGetGeneAssociatedCompounds.mockImplementation((_ko, pagination) => {
      if (pagination.page === 2) {
        return Promise.resolve({
          data: [
            {
              cpd: 'C00067',
              compoundname: 'Formaldehyde',
              compoundclass: 'Aliphatic',
              reference_ag: 'ATSDR',
              reference_count: 1,
              ko_count: 127,
              gene_count: 127,
              pathway_count: 14,
              toxicity_risk_mean: 0.26,
              high_risk_endpoint_count: 3,
              smiles: 'C=O',
              updated_at: '2026-04-05',
            },
          ],
          page: 2,
          pageSize: 25,
          total: 2,
          totalPages: 2,
        });
      }

      return Promise.resolve({
        data: [
          {
            cpd: 'C00014',
            compoundname: 'Ammonia',
            compoundclass: 'Nitrogen-containing',
            reference_ag: 'ATSDR; PSL',
            reference_count: 2,
            ko_count: 334,
            gene_count: 327,
            pathway_count: 25,
            toxicity_risk_mean: 0.22,
            high_risk_endpoint_count: 2,
            smiles: '[H]N([H])[H]',
            updated_at: '2026-04-05',
          },
        ],
        page: 1,
        pageSize: 25,
        total: 2,
        totalPages: 2,
      });
    });

    mockGetGeneDetailOverview.mockResolvedValue({
      ko: 'K00001',
      summary: {
        linked_compounds_total: 2,
        toxicity_compounds: 1,
        excluded_no_toxicity: 1,
        endpoint_count: 4,
        toxicity_coverage_pct: 50,
      },
      toxicity_matrix: {
        compounds: [],
        endpoints: [],
        cells: [],
      },
    });

    mockGetGeneMetadata.mockResolvedValue({
      identifiers: { ko: 'K00001' },
      data_sources: [],
      quantitative_overview: {},
    } as any);
  });

  it('loads overview by default and lazily loads metadata only once', async () => {
    const user = userEvent.setup();

    render(<GeneDetail ko="K00001" onBack={vi.fn()} onCompoundSelect={vi.fn()} />);

    expect(await screen.findByText('Gene Overview K00001')).toBeInTheDocument();
    expect(mockGetGeneDetailOverview).toHaveBeenCalledTimes(1);
    expect(mockGetGeneMetadata).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(await screen.findByText('Gene Metadata K00001')).toBeInTheDocument();
    expect(mockGetGeneMetadata).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(mockGetGeneDetailOverview).toHaveBeenCalledTimes(1);
    expect(mockGetGeneMetadata).toHaveBeenCalledTimes(1);
  });

  it('paginates associated compounds, forwards row selection, and handles back navigation', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onCompoundSelect = vi.fn();

    render(<GeneDetail ko="K00001" onBack={onBack} onCompoundSelect={onCompoundSelect} />);

    await user.click(await screen.findByRole('tab', { name: 'Associated Compounds (2)' }));
    expect(await screen.findByText('Ammonia')).toBeInTheDocument();

    await user.click(screen.getByText('Ammonia'));
    expect(onCompoundSelect).toHaveBeenCalledWith('C00014');

    await user.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(mockGetGeneAssociatedCompounds).toHaveBeenLastCalledWith('K00001', { page: 2, pageSize: 25 });
    });

    expect(await screen.findByText('Formaldehyde')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to Genes' }));
    expect(onBack).toHaveBeenCalled();
  });
});
