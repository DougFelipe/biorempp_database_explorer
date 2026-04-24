import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeneExplorer } from '@/components/GeneExplorer';

const { mockGetGenes } = vi.hoisted(() => ({
  mockGetGenes: vi.fn(),
}));

vi.mock('@/features/genes/api', () => ({
  getGenes: mockGetGenes,
}));

describe('GeneExplorer', () => {
  beforeEach(() => {
    mockGetGenes.mockResolvedValue({
      data: [
        {
          ko: 'K00001',
          genesymbol: 'nahA',
          genename: 'Naphthalene dioxygenase alpha subunit',
          compound_count: 12,
          pathway_count: 4,
          enzyme_activities: ['dioxygenase', 'oxidoreductase', 'hydrolase'],
          updated_at: '2026-04-05',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it('filters by search and opens the selected gene detail', async () => {
    const user = userEvent.setup();
    const onGeneSelect = vi.fn();

    render(<GeneExplorer onGeneSelect={onGeneSelect} />);

    expect(await screen.findByText('nahA')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search by gene symbol, name, or KO...'), 'nahA');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockGetGenes).toHaveBeenLastCalledWith({ search: 'nahA' }, { page: 1, pageSize: 50 });
    });

    await user.click(screen.getByRole('button', { name: 'K00001' }));
    expect(onGeneSelect).toHaveBeenCalledWith('K00001');
  });
});
