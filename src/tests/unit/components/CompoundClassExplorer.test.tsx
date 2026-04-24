import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompoundClassExplorer } from '@/components/CompoundClassExplorer';

const { mockGetCompoundClasses } = vi.hoisted(() => ({
  mockGetCompoundClasses: vi.fn(),
}));

vi.mock('@/features/compound-classes/api', () => ({
  getCompoundClasses: mockGetCompoundClasses,
}));

describe('CompoundClassExplorer', () => {
  beforeEach(() => {
    mockGetCompoundClasses.mockResolvedValue({
      data: [
        {
          compoundclass: 'Aromatic',
          compound_count: 76,
          ko_count: 361,
          gene_count: 359,
          pathway_count: 57,
          updated_at: '2026-04-05',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it('filters by search and opens the selected compound class detail', async () => {
    const user = userEvent.setup();
    const onCompoundClassSelect = vi.fn();

    render(<CompoundClassExplorer onCompoundClassSelect={onCompoundClassSelect} />);

    expect(await screen.findByText('Aromatic')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search by compound class...'), 'Aromatic');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockGetCompoundClasses).toHaveBeenLastCalledWith({ search: 'Aromatic' }, { page: 1, pageSize: 50 });
    });

    await user.click(screen.getByRole('button', { name: 'Aromatic' }));
    expect(onCompoundClassSelect).toHaveBeenCalledWith('Aromatic');
  });
});
