export interface GuidedQueryDefinition {
  id: string;
  category: 'compound_analysis';
  title: string;
  question: string;
  description: string;
  dataset: 'compound_summary';
  groupBy: 'cpd';
  metric: 'ko_count' | 'toxicity_risk_mean';
  sort: {
    field: 'ko_count' | 'toxicity_risk_mean';
    order: 'desc' | 'asc';
  };
  visualizations: Array<'barplot' | 'scatter' | 'table'>;
}

export const GUIDED_QUERIES: GuidedQueryDefinition[] = [
  {
    id: 'uc1_top_bioremediation_compounds',
    category: 'compound_analysis',
    title: 'Top Bioremediation Compounds',
    question: 'Which BioRemPP compounds show the highest functional diversity?',
    description: 'Compounds ranked by KO count using the canonical compound_summary dataset.',
    dataset: 'compound_summary',
    groupBy: 'cpd',
    metric: 'ko_count',
    sort: {
      field: 'ko_count',
      order: 'desc',
    },
    visualizations: ['barplot', 'table'],
  },
  {
    id: 'uc3_risk_vs_bioremediation_potential',
    category: 'compound_analysis',
    title: 'Risk vs Bioremediation Potential',
    question: 'Which compounds show high degradation potential and high risk?',
    description:
      'Scatter plot using gene_count (potential) vs toxicity_risk_mean (risk), with pathway_count as point size.',
    dataset: 'compound_summary',
    groupBy: 'cpd',
    metric: 'toxicity_risk_mean',
    sort: {
      field: 'toxicity_risk_mean',
      order: 'desc',
    },
    visualizations: ['scatter', 'table'],
  },
];
