import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PathwayDetail } from '@/components/PathwayDetail';

const { mockGetPathwayDetailOverview } = vi.hoisted(() => ({
  mockGetPathwayDetailOverview: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  getPathwayDetailOverview: mockGetPathwayDetailOverview,
}));

vi.mock('@/components/charts/ChartCard', () => ({
  ChartCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock('@/components/charts/HorizontalBarChart', () => ({
  HorizontalBarChart: () => <div>Horizontal Bar Chart</div>,
}));

vi.mock('@/components/charts/DonutChart', () => ({
  DonutChart: () => <div>Donut Chart</div>,
}));

vi.mock('@/components/pathway-overview/PathwayToxicityHeatmap', () => ({
  PathwayToxicityHeatmap: () => <div>Toxicity Heatmap</div>,
}));

describe('PathwayDetail', () => {
  it('renders loading and then the pathway overview content', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    mockGetPathwayDetailOverview.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    render(<PathwayDetail pathway="Benzoate degradation" onBack={vi.fn()} />);

    expect(screen.getByText('Loading pathway overview')).toBeInTheDocument();

    resolveRequest?.({
      pathway: 'Benzoate degradation',
      available_sources: ['KEGG', 'HADEG'],
      selected_source: 'ALL',
      summary: {
        pathway: 'Benzoate degradation',
        selected_source: 'ALL',
        ko_count: 10,
        gene_count: 8,
        compound_count: 6,
        reaction_ec_count: 4,
        pathway_count: 0,
        source_count: 2,
        ko_overlap_pct: 50,
      },
      ko_distribution: [],
      gene_distribution: [],
      ec_class_distribution: [],
      toxicity_matrix: { compounds: [], endpoints: [], cells: [] },
    });

    expect(await screen.findByRole('heading', { name: 'Benzoate degradation' })).toBeInTheDocument();
    expect(screen.getAllByText('Horizontal Bar Chart')).toHaveLength(2);
    expect(screen.getByText('Toxicity Heatmap')).toBeInTheDocument();
  });

  it('renders an error state when the request fails', async () => {
    mockGetPathwayDetailOverview.mockRejectedValue(new Error('request failed'));

    render(<PathwayDetail pathway="Benzoate degradation" onBack={vi.fn()} />);

    expect(await screen.findByText('Unable to load pathway overview.')).toBeInTheDocument();
    expect(screen.getByText('request failed')).toBeInTheDocument();
  });

  it('renders not-found and wires the back action', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    mockGetPathwayDetailOverview.mockResolvedValue(null);

    render(<PathwayDetail pathway="Unknown pathway" onBack={onBack} />);

    expect(await screen.findByText('Pathway not found.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to Pathways' }));
    expect(onBack).toHaveBeenCalled();
  });
});
