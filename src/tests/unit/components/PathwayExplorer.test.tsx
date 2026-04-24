import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PathwayExplorer } from '@/components/PathwayExplorer';

const { mockGetPathways } = vi.hoisted(() => ({
  mockGetPathways: vi.fn(),
}));

vi.mock('@/features/pathways/api', () => ({
  getPathways: mockGetPathways,
}));

describe('PathwayExplorer', () => {
  beforeEach(() => {
    mockGetPathways.mockResolvedValue({
      data: [
        {
          pathway: 'Benzoate degradation',
          source: 'KEGG',
          compound_count: 5,
          gene_count: 12,
          updated_at: '2026-04-05',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it('starts with KEGG selected, switches source, and opens the selected pathway', async () => {
    const user = userEvent.setup();
    const onPathwaySelect = vi.fn();

    render(<PathwayExplorer onPathwaySelect={onPathwaySelect} />);

    expect(await screen.findByText('Benzoate degradation')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetPathways).toHaveBeenLastCalledWith({ source: 'KEGG' }, { page: 1, pageSize: 50 });
    });

    await user.click(screen.getByRole('button', { name: 'HADEG' }));

    await waitFor(() => {
      expect(mockGetPathways).toHaveBeenLastCalledWith({ source: 'HADEG' }, { page: 1, pageSize: 50 });
    });

    await user.click(screen.getByRole('button', { name: 'Benzoate degradation' }));
    expect(onPathwaySelect).toHaveBeenCalledWith('Benzoate degradation', 'KEGG');
  });
});
