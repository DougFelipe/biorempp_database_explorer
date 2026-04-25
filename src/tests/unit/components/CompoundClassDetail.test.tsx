import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompoundClassDetail } from '@/components/CompoundClassDetail';

const { mockGetCompoundClassDetailOverview } = vi.hoisted(() => ({
  mockGetCompoundClassDetailOverview: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  getCompoundClassDetailOverview: mockGetCompoundClassDetailOverview,
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

describe('CompoundClassDetail', () => {
  it('renders loading and then the compound class overview content', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    mockGetCompoundClassDetailOverview.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    render(<CompoundClassDetail compoundclass="Aromatic" onBack={vi.fn()} />);

    expect(screen.getByText('Loading compound class overview')).toBeInTheDocument();

    resolveRequest?.({
      compoundclass: 'Aromatic',
      summary: {
        compoundclass: 'Aromatic',
        ko_count: 10,
        gene_count: 8,
        compound_count: 6,
        reaction_ec_count: 4,
        pathway_count: 0,
        source_count: 3,
        toxicity_coverage_pct: 50,
      },
      ko_distribution: [],
      gene_distribution: [],
      ec_class_distribution: [],
      toxicity_matrix: { compounds: [], endpoints: [], cells: [] },
    });

    expect(await screen.findByRole('heading', { name: 'Aromatic' })).toBeInTheDocument();
    expect(screen.getAllByText('Horizontal Bar Chart')).toHaveLength(2);
    expect(screen.getByText('Toxicity Heatmap')).toBeInTheDocument();
  });

  it('renders an error state when the request fails', async () => {
    mockGetCompoundClassDetailOverview.mockRejectedValue(new Error('request failed'));

    render(<CompoundClassDetail compoundclass="Aromatic" onBack={vi.fn()} />);

    expect(await screen.findByText('Unable to load compound class overview.')).toBeInTheDocument();
    expect(screen.getByText('request failed')).toBeInTheDocument();
  });

  it('renders not-found and wires the back action', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();

    mockGetCompoundClassDetailOverview.mockResolvedValue(null);

    render(<CompoundClassDetail compoundclass="Unknown class" onBack={onBack} />);

    expect(await screen.findByText('Compound class not found.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to Compound Classes' }));
    expect(onBack).toHaveBeenCalled();
  });
});
