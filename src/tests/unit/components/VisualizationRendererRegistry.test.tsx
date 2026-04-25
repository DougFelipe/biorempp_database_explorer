import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VisualizationRendererRegistry } from '@/components/guided-analysis/VisualizationRendererRegistry';

const SUPPORTED_VISUALIZATIONS = [
  {
    id: 'bar',
    type: 'horizontal_bar' as const,
    title: 'Top compounds',
    subtitle: 'Ranked view',
    data_key: 'top_compounds',
    data: {
      items: [
        {
          id: 'C00014',
          label: 'Ammonia',
          value: 334,
        },
      ],
      empty_message: 'No compounds',
    },
  },
  {
    id: 'scatter',
    type: 'scatter_quadrant' as const,
    title: 'Risk vs Potential',
    subtitle: 'Quadrant view',
    data_key: 'scatter',
    data: {
      points: [
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
      ],
      x_threshold: 100,
      y_threshold: 0.5,
      x_field: 'gene_count',
      y_field: 'toxicity_risk_mean',
      y_metric_label: 'toxicity_risk_mean',
      endpoint: 'nr-ar',
      x_scale: 'log10p1' as const,
      threshold_basis: 'median',
    },
  },
  {
    id: 'heatmap',
    type: 'heatmap_matrix' as const,
    title: 'Heatmap',
    subtitle: 'Matrix view',
    data_key: 'heatmap',
    data: {
      row_label: 'Compound',
      row_label_plural: 'Compounds',
      total_compounds_in_scope: 1,
      compounds: [
        {
          cpd: 'C00014',
          compoundname: 'Ammonia',
        },
      ],
      endpoints: ['nr-ar'],
      cells: [
        {
          cpd: 'C00014',
          endpoint: 'nr-ar',
          label: 'Low Risk',
          value: 0.22,
          risk_bucket: 'low_risk',
        },
      ],
    },
  },
  {
    id: 'boxplot',
    type: 'boxplot' as const,
    title: 'Toxicity distribution',
    subtitle: 'Grouped by class',
    data_key: 'boxplot',
    data: {
      groups: [
        {
          id: 'aromatic',
          label: 'Aromatic',
          count: 2,
          min: 0.1,
          q1: 0.2,
          median: 0.3,
          q3: 0.4,
          max: 0.5,
        },
      ],
      empty_message: 'No groups',
      y_label: 'toxicity score',
    },
  },
];

describe('VisualizationRendererRegistry', () => {
  it('renders supported visualization types through the declarative registry', () => {
    render(
      <VisualizationRendererRegistry
        visualizations={SUPPORTED_VISUALIZATIONS}
        onCompoundSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Top compounds' })).toBeInTheDocument();
    expect(screen.getAllByText('Ammonia').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Risk vs Potential' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Risk potential scatter chart' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Heatmap' })).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 1 compounds')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Toxicity distribution' })).toBeInTheDocument();
    expect(screen.getByText('toxicity score')).toBeInTheDocument();
  });

  it('renders a fallback state for unregistered visualization types and ignores table entries', () => {
    render(
      <VisualizationRendererRegistry
        visualizations={[
          {
            id: 'unsupported',
            type: 'unknown_visual' as any,
            title: 'Unsupported visualization',
            subtitle: null,
            data_key: 'unsupported',
            data: {},
          },
          {
            id: 'table',
            type: 'table',
            title: 'Table renderer',
            subtitle: null,
            data_key: 'table',
            data: null,
          },
        ]}
        onCompoundSelect={vi.fn()}
      />
    );

    expect(
      screen.getByText('Visualization type "unknown_visual" is not registered.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Table renderer' })).not.toBeInTheDocument();
  });
});
