import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompoundDetail } from '@/components/CompoundDetail';

const {
  mockGetCompoundById,
  mockGetCompoundGenes,
  mockGetCompoundMetadata,
  mockGetCompoundOverview,
  mockGetCompoundToxicityProfile,
} = vi.hoisted(() => ({
  mockGetCompoundById: vi.fn(),
  mockGetCompoundGenes: vi.fn(),
  mockGetCompoundMetadata: vi.fn(),
  mockGetCompoundOverview: vi.fn(),
  mockGetCompoundToxicityProfile: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  getCompoundById: mockGetCompoundById,
  getCompoundGenes: mockGetCompoundGenes,
  getCompoundMetadata: mockGetCompoundMetadata,
  getCompoundOverview: mockGetCompoundOverview,
  getCompoundToxicityProfile: mockGetCompoundToxicityProfile,
}));

vi.mock('@/components/CompoundOverviewTab', () => ({
  CompoundOverviewTab: ({ overview }: { overview: { cpd: string } }) => <div>Compound Overview {overview.cpd}</div>,
}));

vi.mock('@/components/CompoundMetadataPanel', () => ({
  CompoundMetadataPanel: ({ metadata }: { metadata: { identifiers: { cpd: string } } }) => (
    <div>Compound Metadata {metadata.identifiers.cpd}</div>
  ),
}));

describe('CompoundDetail', () => {
  beforeEach(() => {
    mockGetCompoundById.mockResolvedValue({
      cpd: 'C00014',
      compoundname: 'Ammonia',
      compoundclass: 'Nitrogen-containing',
      reference_ag: 'ATSDR; PSL',
      reference_count: 2,
      ko_count: 334,
      gene_count: 2,
      pathway_count: 25,
      toxicity_risk_mean: 0.22,
      high_risk_endpoint_count: 2,
      toxicity_scores: {},
      smiles: '[H]N([H])[H]',
      genes: [],
      pathways: [],
      updated_at: '2026-04-05',
    });

    mockGetCompoundGenes.mockImplementation((_cpd, pagination) => {
      if (pagination.page === 2) {
        return Promise.resolve({
          data: [
            {
              cpd: 'C00014',
              ko: 'K00002',
              genesymbol: 'catA',
              genename: 'Catechol 1,2-dioxygenase',
              enzyme_activity: 'dioxygenase',
              ec: '1.13.11.1',
              reaction_descriptions: [],
              reaction_descriptions_total: 0,
              supporting_rows: 1,
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
            ko: 'K00001',
            genesymbol: 'nahA',
            genename: 'Naphthalene dioxygenase alpha subunit',
            enzyme_activity: 'dioxygenase',
            ec: '1.14.12.12',
            reaction_descriptions: [],
            reaction_descriptions_total: 0,
            supporting_rows: 1,
            updated_at: '2026-04-05',
          },
        ],
        page: 1,
        pageSize: 25,
        total: 2,
        totalPages: 2,
      });
    });

    mockGetCompoundOverview.mockResolvedValue({
      cpd: 'C00014',
      summary: {},
      limits: { top_ko: 10, top_pathways: 10 },
      ko_bar: [],
      pathways_top_kegg: [],
      pathways_top_hadeg: [],
      pathway_coverage: { sources: [], pathways: [], cells: [] },
      metric_basis: {
        ko_bar: 'count',
        pathways_top_kegg: 'count',
        pathways_top_hadeg: 'count',
        pathway_coverage_weight: 'weight',
      },
      toxicity_heatmap: [],
    } as any);

    mockGetCompoundMetadata.mockResolvedValue({
      identifiers: { cpd: 'C00014' },
      data_sources: [],
      functional_annotation: {},
      chemical_information: {},
      provenance: {},
      cross_references: {},
      data_quality: {},
    } as any);

    mockGetCompoundToxicityProfile.mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 200,
      total: 0,
      totalPages: 1,
    });
  });

  it('loads overview by default and lazily loads metadata only once', async () => {
    const user = userEvent.setup();

    render(<CompoundDetail cpd="C00014" onBack={vi.fn()} />);

    expect(await screen.findByText('Compound Overview C00014')).toBeInTheDocument();
    expect(mockGetCompoundOverview).toHaveBeenCalledTimes(1);
    expect(mockGetCompoundMetadata).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(await screen.findByText('Compound Metadata C00014')).toBeInTheDocument();
    expect(mockGetCompoundMetadata).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(mockGetCompoundOverview).toHaveBeenCalledTimes(1);
    expect(mockGetCompoundMetadata).toHaveBeenCalledTimes(1);
  });

  it('paginates associated genes and handles back navigation', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<CompoundDetail cpd="C00014" onBack={onBack} />);

    await user.click(await screen.findByRole('tab', { name: 'Associated Genes (2)' }));
    expect(await screen.findByText('nahA')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(mockGetCompoundGenes).toHaveBeenLastCalledWith('C00014', { page: 2, pageSize: 25 });
    });

    expect(await screen.findByText('catA')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to Compounds' }));
    expect(onBack).toHaveBeenCalled();
  });
});
