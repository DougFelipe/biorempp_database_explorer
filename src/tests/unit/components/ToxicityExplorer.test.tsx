import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToxicityExplorer } from '@/components/ToxicityExplorer';

const {
  mockGetToxicityData,
  mockGetToxicityEndpoints,
  mockGetToxicityLabels,
  mockGetUniqueCompoundClasses,
} = vi.hoisted(() => ({
  mockGetToxicityData: vi.fn(),
  mockGetToxicityEndpoints: vi.fn(),
  mockGetToxicityLabels: vi.fn(),
  mockGetUniqueCompoundClasses: vi.fn(),
}));

vi.mock('@/features/toxicity/api', () => ({
  getToxicityData: mockGetToxicityData,
  getToxicityEndpoints: mockGetToxicityEndpoints,
  getToxicityLabels: mockGetToxicityLabels,
}));

vi.mock('@/features/meta/api', () => ({
  getUniqueCompoundClasses: mockGetUniqueCompoundClasses,
}));

describe('ToxicityExplorer', () => {
  beforeEach(() => {
    mockGetToxicityEndpoints.mockResolvedValue(['nr_ar']);
    mockGetUniqueCompoundClasses.mockResolvedValue(['Nitrogen-containing']);
    mockGetToxicityLabels.mockResolvedValue(['High Risk', 'Medium Risk']);
    mockGetToxicityData.mockResolvedValue({
      data: [
        {
          cpd: 'C00014',
          compoundname: 'Ammonia',
          compoundclass: 'Nitrogen-containing',
          endpoint: 'nr_ar',
          label: 'High Risk',
          value: 0.9182,
          updated_at: '2026-04-05',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it('loads endpoint metadata, filters by search, and preserves the endpoint when clearing filters', async () => {
    const user = userEvent.setup();

    render(<ToxicityExplorer />);

    expect(await screen.findByRole('heading', { name: 'Toxicity Explorer' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetToxicityLabels).toHaveBeenLastCalledWith('nr_ar');
    });

    await user.type(screen.getByPlaceholderText('Search by compound name or ID...'), 'Ammonia');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(mockGetToxicityData).toHaveBeenLastCalledWith({ endpoint: 'nr_ar', search: 'Ammonia' }, { page: 1, pageSize: 50 });
    });

    await user.click(await screen.findByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      expect(mockGetToxicityData).toHaveBeenLastCalledWith({ endpoint: 'nr_ar' }, { page: 1, pageSize: 50 });
    });
  });
});
