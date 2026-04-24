import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompoundExplorer } from '@/components/CompoundExplorer';

const {
  mockExportCompoundsToCSV,
  mockExportCompoundsToJSON,
  mockGetCompounds,
  mockGetPathwayOptions,
  mockGetUniqueCompoundClasses,
  mockGetUniqueGenes,
  mockGetUniqueReferenceAGs,
} = vi.hoisted(() => ({
  mockExportCompoundsToCSV: vi.fn(),
  mockExportCompoundsToJSON: vi.fn(),
  mockGetCompounds: vi.fn(),
  mockGetPathwayOptions: vi.fn(),
  mockGetUniqueCompoundClasses: vi.fn(),
  mockGetUniqueGenes: vi.fn(),
  mockGetUniqueReferenceAGs: vi.fn(),
}));

vi.mock('@/features/compounds/api', () => ({
  exportCompoundsToCSV: mockExportCompoundsToCSV,
  exportCompoundsToJSON: mockExportCompoundsToJSON,
  getCompounds: mockGetCompounds,
}));

vi.mock('@/features/meta/api', () => ({
  getPathwayOptions: mockGetPathwayOptions,
  getUniqueCompoundClasses: mockGetUniqueCompoundClasses,
  getUniqueGenes: mockGetUniqueGenes,
  getUniqueReferenceAGs: mockGetUniqueReferenceAGs,
}));

describe('CompoundExplorer', () => {
  beforeEach(() => {
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
      { pathway: 'Catechol degradation', source: 'HADEG' },
    ]);
    mockExportCompoundsToCSV.mockResolvedValue('cpd\nC00014');
    mockExportCompoundsToJSON.mockResolvedValue('[{"cpd":"C00014"}]');

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:compound-export'),
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  });

  it('applies search filters, clears them, and opens a compound detail from the result row', async () => {
    const user = userEvent.setup();
    const onCompoundSelect = vi.fn();

    render(<CompoundExplorer onCompoundSelect={onCompoundSelect} />);

    expect(await screen.findByText('Ammonia')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search by compound name or ID...'), 'Ammonia');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockGetCompounds).toHaveBeenLastCalledWith({ search: 'Ammonia' }, { page: 1, pageSize: 50 });
    });

    await user.click(await screen.findByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(mockGetCompounds).toHaveBeenLastCalledWith({}, { page: 1, pageSize: 50 });
    });

    await user.click(screen.getByRole('button', { name: 'C00014' }));
    expect(onCompoundSelect).toHaveBeenCalledWith('C00014');
  });

  it('exports CSV using the shared file export flow', async () => {
    const user = userEvent.setup();

    render(<CompoundExplorer onCompoundSelect={vi.fn()} />);

    expect(await screen.findByText('Ammonia')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => {
      expect(mockExportCompoundsToCSV).toHaveBeenCalledWith({});
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });
  });
});
