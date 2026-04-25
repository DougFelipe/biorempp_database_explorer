import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GuidedToxicityHeatmapMatrix } from '@/components/guided-analysis/GuidedToxicityHeatmapMatrix';

describe('GuidedToxicityHeatmapMatrix', () => {
  it('renders the shared empty state when the guided matrix has no rows or endpoints', () => {
    render(
      <GuidedToxicityHeatmapMatrix
        matrix={{
          row_label: 'Compound',
          row_label_plural: 'Compounds',
          total_compounds_in_scope: 0,
          compounds: [],
          endpoints: [],
          cells: [],
        }}
      />
    );

    expect(
      screen.getByText('No toxicity matrix data available for this guided query.')
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
