import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RiskPotentialScatterChart } from '@/components/guided-analysis/RiskPotentialScatterChart';

const SCATTER_POINTS = [
  {
    cpd: 'C00014',
    compoundname: 'Ammonia',
    compoundclass: 'Nitrogen-containing',
    gene_count: 334,
    ko_count: 334,
    pathway_count: 25,
    toxicity_risk_mean: 0.22,
    y_value: 0.22,
    quadrant: 'bottom_right' as const,
  },
  {
    cpd: 'C00067',
    compoundname: 'Formaldehyde',
    compoundclass: 'Aliphatic',
    gene_count: 127,
    ko_count: 127,
    pathway_count: 14,
    toxicity_risk_mean: 0.74,
    y_value: 0.74,
    quadrant: 'top_right' as const,
  },
];

describe('RiskPotentialScatterChart', () => {
  it('renders the shared empty state when no points are available', () => {
    render(
      <RiskPotentialScatterChart
        points={[]}
        xThreshold={100}
        yThreshold={0.5}
        onSelectCompound={vi.fn()}
      />
    );

    expect(
      screen.getByText('No compounds with toxicity risk available for scatter plot.')
    ).toBeInTheDocument();
  });

  it('renders thresholds, quadrant labels and forwards point clicks', async () => {
    const user = userEvent.setup();
    const onSelectCompound = vi.fn();

    render(
      <RiskPotentialScatterChart
        points={SCATTER_POINTS}
        xThreshold={100}
        yThreshold={0.5}
        xScaleMode="log10p1"
        yMetricLabel="toxicity_risk_mean"
        onSelectCompound={onSelectCompound}
      />
    );

    expect(
      screen.getByRole('img', { name: 'Risk potential scatter chart' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('scatter-threshold-x')).toBeInTheDocument();
    expect(screen.getByTestId('scatter-threshold-y')).toBeInTheDocument();
    expect(screen.getByText('High Risk + High Potential')).toBeInTheDocument();
    expect(screen.getByText('Low Risk + Low Potential')).toBeInTheDocument();
    expect(screen.getByText('Nitrogen-containing')).toBeInTheDocument();
    expect(screen.getByText('Aliphatic')).toBeInTheDocument();

    await user.click(screen.getByTestId('scatter-point-C00014'));
    expect(onSelectCompound).toHaveBeenCalledWith('C00014');
  });
});
