import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  ChartTooltip,
  HeatmapLegend,
  VisualizationCardShell,
  VisualizationEmptyState,
  VisualizationErrorState,
} from '@/shared/visualization';

describe('shared visualization foundation', () => {
  it('renders the shared visualization card shell', () => {
    render(
      <VisualizationCardShell
        title="Top compounds"
        subtitle="Ranked by remediation breadth"
      >
        <div>Chart content</div>
      </VisualizationCardShell>
    );

    expect(screen.getByRole('heading', { name: 'Top compounds' })).toBeInTheDocument();
    expect(screen.getByText('Ranked by remediation breadth')).toBeInTheDocument();
    expect(screen.getByText('Chart content')).toBeInTheDocument();
  });

  it('renders the shared visualization empty state', () => {
    render(<VisualizationEmptyState message="No matrix data available." />);

    expect(screen.getByText('No visualization data available')).toBeInTheDocument();
    expect(screen.getByText('No matrix data available.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the shared visualization error state and action', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <VisualizationErrorState
        message="Renderer setup failed."
        actionLabel="Retry"
        onAction={onRetry}
      />
    );

    expect(screen.getByText('Unable to render visualization')).toBeInTheDocument();
    expect(screen.getByText('Renderer setup failed.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders heatmap legends with discrete items and gradient scale', () => {
    render(
      <HeatmapLegend
        discreteItems={[
          { label: 'High Risk', color: '#fca5a5' },
          { label: 'Low Risk', color: '#86efac' },
        ]}
        scaleLabel="Prediction scale"
        footer="Reference source"
      />
    );

    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
    expect(screen.getByText('Prediction scale')).toBeInTheDocument();
    expect(screen.getByText('Reference source')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('applies shared tooltip content through title attributes', () => {
    render(
      <ChartTooltip content="Compound A | endpoint x: 0.42" data-testid="tooltip-cell">
        <span>0.42</span>
      </ChartTooltip>
    );

    expect(screen.getByTestId('tooltip-cell')).toHaveAttribute(
      'title',
      'Compound A | endpoint x: 0.42'
    );
  });
});
