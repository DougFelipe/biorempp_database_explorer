import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuidedAnalysisPage } from '@/components/GuidedAnalysisPage';

const {
  mockExecuteGuidedQuery,
  mockGetGuidedCatalog,
  mockGetGuidedQueryOptions,
  mockGetGuidedQueryRecipe,
} = vi.hoisted(() => ({
  mockExecuteGuidedQuery: vi.fn(),
  mockGetGuidedCatalog: vi.fn(),
  mockGetGuidedQueryOptions: vi.fn(),
  mockGetGuidedQueryRecipe: vi.fn(),
}));

vi.mock('@/features/guided-analysis/api', () => ({
  executeGuidedQuery: mockExecuteGuidedQuery,
  getGuidedCatalog: mockGetGuidedCatalog,
  getGuidedQueryOptions: mockGetGuidedQueryOptions,
}));

vi.mock('@/config/guidedQueryRecipes', () => ({
  getGuidedQueryRecipe: mockGetGuidedQueryRecipe,
}));

const GUIDED_CATALOG = {
  version: '1.0.0',
  title: 'Guided Analysis',
  categories: [
    {
      id: 'compound-analysis',
      label: 'Compound Analysis',
    },
  ],
  generated_at: '2026-04-25',
  queries: [
    {
      id: 'top_bioremediation_compounds',
      category: 'compound-analysis',
      title: 'Top Bioremediation Compounds',
      question: 'Which compounds have the highest remediation breadth?',
      description: 'Ranks compounds by selected remediation metric.',
      dataset: 'compound_summary',
      executor: 'sqlite',
      defaults: {
        page_size: 10,
        filters: {
          search_compound: 'Ammonia',
          metric: 'gene_count',
          endpoint: 'nr-ar',
        },
      },
      executor_config: {},
      filters: [
        {
          id: 'search_compound',
          type: 'search',
          label: 'Search Compound',
          placeholder: 'Name or CPD',
        },
        {
          id: 'metric',
          type: 'select',
          label: 'Ranking Metric',
        },
        {
          id: 'endpoint',
          type: 'dependent_select',
          label: 'Endpoint',
          depends_on: 'metric',
        },
      ],
      use_case_description: {
        scientific_question: 'Which compounds should be inspected first?',
        description: 'Guides exploratory prioritization of compounds.',
        interpretation: ['Use this ranking as exploratory evidence only.'],
      },
      methods_modal: {
        button_label: 'View Methods',
        title: 'Methods',
        introduction: 'Methods overview.',
        steps: [],
      },
      summary_cards: [],
      visualizations: [],
      table: {
        id: 'guided-results',
        title: 'Ranked compounds',
        columns: [
          {
            id: 'cpd',
            label: 'Compound ID',
            type: 'compound_link',
          },
          {
            id: 'compoundname',
            label: 'Compound Name',
            type: 'text',
          },
        ],
        row_click_field: 'cpd',
        empty_message: 'No compounds available.',
      },
      insights: [],
    },
    {
      id: 'most_toxic_compounds',
      category: 'compound-analysis',
      title: 'Most Toxic Compounds',
      question: 'Which compounds have the strongest toxicity signal?',
      description: 'Ranks compounds by toxicity-focused metric.',
      dataset: 'toxicity_summary',
      executor: 'sqlite',
      defaults: {
        page_size: 10,
        filters: {
          search_compound: 'Formaldehyde',
          metric: 'toxicity_mean',
          endpoint: 'sr-mmp',
        },
      },
      executor_config: {},
      filters: [
        {
          id: 'search_compound',
          type: 'search',
          label: 'Search Compound',
          placeholder: 'Name or CPD',
        },
        {
          id: 'metric',
          type: 'select',
          label: 'Ranking Metric',
        },
        {
          id: 'endpoint',
          type: 'dependent_select',
          label: 'Endpoint',
          depends_on: 'metric',
        },
      ],
      use_case_description: {
        scientific_question: 'Which compounds concentrate the highest risk?',
        description: 'Supports exploratory toxicity review.',
        interpretation: ['Do not treat this as confirmatory evidence.'],
      },
      methods_modal: {
        button_label: 'View Methods',
        title: 'Methods',
        introduction: 'Methods overview.',
        steps: [],
      },
      summary_cards: [],
      visualizations: [],
      table: {
        id: 'guided-results',
        title: 'Ranked compounds',
        columns: [
          {
            id: 'cpd',
            label: 'Compound ID',
            type: 'compound_link',
          },
          {
            id: 'compoundname',
            label: 'Compound Name',
            type: 'text',
          },
        ],
        row_click_field: 'cpd',
        empty_message: 'No compounds available.',
      },
      insights: [],
    },
  ],
};

function buildOptions(queryId: string, filters: Record<string, string>) {
  const metricOptions = [
    { value: 'gene_count', label: 'Gene Count' },
    { value: 'toxicity_mean', label: 'Toxicity Mean' },
  ];

  if (queryId === 'most_toxic_compounds') {
    return {
      query_id: queryId,
      options: {
        metric: metricOptions,
        endpoint: [{ value: 'sr-mmp', label: 'SR MMP' }],
      },
    };
  }

  const endpointOptions =
    filters.metric === 'toxicity_mean'
      ? [{ value: 'sr-mmp', label: 'SR MMP' }]
      : [{ value: 'nr-ar', label: 'NR AR' }];

  return {
    query_id: queryId,
    options: {
      metric: metricOptions,
      endpoint: endpointOptions,
    },
  };
}

function buildExecutionResponse(
  queryId: string,
  page: number,
  compoundId: string,
  compoundName: string
) {
  return {
    meta: {
      query_id: queryId,
      dataset:
        queryId === 'most_toxic_compounds' ? 'toxicity_summary' : 'compound_summary',
      version: '1.0.0',
      execution_ms: 7,
      page,
      pageSize: 10,
      total: 2,
      totalPages: 2,
    },
    summary_cards: [],
    visualizations: [],
    insights: [],
    filters_applied: {},
    table: {
      id: 'guided-results',
      title: 'Ranked compounds',
      columns: [
        {
          id: 'cpd',
          label: 'Compound ID',
          type: 'compound_link',
        },
        {
          id: 'compoundname',
          label: 'Compound Name',
          type: 'text',
        },
      ],
      row_click_field: 'cpd',
      empty_message: 'No compounds available.',
      rows: [
        {
          cpd: compoundId,
          compoundname: compoundName,
        },
      ],
      page,
      pageSize: 10,
      total: 2,
      totalPages: 2,
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe('GuidedAnalysisPage', () => {
  beforeEach(() => {
    mockExecuteGuidedQuery.mockReset();
    mockGetGuidedCatalog.mockReset();
    mockGetGuidedQueryOptions.mockReset();
    mockGetGuidedQueryRecipe.mockReset();
    mockGetGuidedCatalog.mockResolvedValue(GUIDED_CATALOG);
    mockGetGuidedQueryRecipe.mockReturnValue(undefined);
    mockGetGuidedQueryOptions.mockImplementation((queryId: string, filters: Record<string, string>) =>
      Promise.resolve(buildOptions(queryId, filters))
    );
    mockExecuteGuidedQuery.mockImplementation(
      (
        queryId: string,
        payload: { page?: number; filters?: Record<string, unknown> } = {}
      ) => {
        const page = payload.page || 1;

        if (queryId === 'most_toxic_compounds') {
          return Promise.resolve(
            buildExecutionResponse(queryId, page, 'C00067', 'Formaldehyde')
          );
        }

        if (page === 2) {
          return Promise.resolve(
            buildExecutionResponse(queryId, page, 'C07210', 'Zidovudine')
          );
        }

        if (payload.filters?.metric === 'toxicity_mean') {
          return Promise.resolve(
            buildExecutionResponse(queryId, page, 'C10984', 'Cypermethrin')
          );
        }

        return Promise.resolve(
          buildExecutionResponse(queryId, page, 'C00014', 'Ammonia')
        );
      }
    );
  });

  it('shows the catalog loading state before the first query is ready', async () => {
    const catalogRequest = createDeferred<typeof GUIDED_CATALOG>();
    mockGetGuidedCatalog.mockReturnValue(catalogRequest.promise);

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    expect(screen.getByText('Loading guided analysis catalog...')).toBeInTheDocument();
    expect(
      screen.getByText('Preparing guided queries and filter defaults.')
    ).toBeInTheDocument();

    catalogRequest.resolve(GUIDED_CATALOG);

    expect(
      await screen.findByRole('heading', { name: 'Top Bioremediation Compounds' })
    ).toBeInTheDocument();
  });

  it('shows the catalog error state and retries successfully', async () => {
    const user = userEvent.setup();

    mockGetGuidedCatalog
      .mockRejectedValueOnce(new Error('Catalog offline'))
      .mockResolvedValueOnce(GUIDED_CATALOG);

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    expect(
      await screen.findByText('Unable to load guided analysis catalog')
    ).toBeInTheDocument();
    expect(screen.getByText('Catalog offline')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('heading', { name: 'Top Bioremediation Compounds' })
    ).toBeInTheDocument();
    expect(mockGetGuidedCatalog).toHaveBeenCalledTimes(2);
  });

  it('loads the first query by default and resets filters when switching queries', async () => {
    const user = userEvent.setup();

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    const searchInput = await screen.findByLabelText('Search Compound');
    expect(searchInput).toHaveValue('Ammonia');

    await waitFor(() => {
      expect(mockExecuteGuidedQuery).toHaveBeenCalledWith(
        'top_bioremediation_compounds',
        {
          page: 1,
          pageSize: 10,
          filters: {
            search_compound: 'Ammonia',
            metric: 'gene_count',
            endpoint: 'nr-ar',
          },
        }
      );
    });

    await user.click(screen.getByRole('button', { name: 'Most Toxic Compounds' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Search Compound')).toHaveValue('Formaldehyde');
      expect(screen.getByLabelText('Ranking Metric')).toHaveValue('toxicity_mean');
      expect(screen.getByLabelText('Endpoint')).toHaveValue('sr-mmp');
    });

    await waitFor(() => {
      expect(mockExecuteGuidedQuery).toHaveBeenLastCalledWith(
        'most_toxic_compounds',
        {
          page: 1,
          pageSize: 10,
          filters: {
            search_compound: 'Formaldehyde',
            metric: 'toxicity_mean',
            endpoint: 'sr-mmp',
          },
        }
      );
    });
  });

  it('sanitizes dependent options and restores defaults on reset', async () => {
    const user = userEvent.setup();

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    const searchInput = await screen.findByLabelText('Search Compound');
    const metricSelect = screen.getByLabelText('Ranking Metric');
    const endpointSelect = screen.getByLabelText('Endpoint');

    await user.clear(searchInput);
    await user.type(searchInput, 'Acetaldehyde');
    await user.selectOptions(metricSelect, 'toxicity_mean');

    await waitFor(() => {
      expect(endpointSelect).toHaveValue('sr-mmp');
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => {
      expect(searchInput).toHaveValue('Ammonia');
      expect(metricSelect).toHaveValue('gene_count');
      expect(endpointSelect).toHaveValue('nr-ar');
      expect(mockExecuteGuidedQuery).toHaveBeenLastCalledWith(
        'top_bioremediation_compounds',
        {
          page: 1,
          pageSize: 10,
          filters: {
            search_compound: 'Ammonia',
            metric: 'gene_count',
            endpoint: 'nr-ar',
          },
        }
      );
    });
  });

  it('re-executes the query when pagination changes', async () => {
    const user = userEvent.setup();

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    expect(await screen.findByText('Ammonia')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(mockExecuteGuidedQuery).toHaveBeenLastCalledWith(
        'top_bioremediation_compounds',
        {
          page: 2,
          pageSize: 10,
          filters: {
            search_compound: 'Ammonia',
            metric: 'gene_count',
            endpoint: 'nr-ar',
          },
        }
      );
    });

    expect(await screen.findByText('Zidovudine')).toBeInTheDocument();
  });

  it('keeps the previous results visible during an incremental refresh', async () => {
    const user = userEvent.setup();
    const refreshExecution = createDeferred<ReturnType<typeof buildExecutionResponse>>();

    mockExecuteGuidedQuery.mockImplementation(
      (
        queryId: string,
        payload: { page?: number; filters?: Record<string, unknown> } = {}
      ) => {
        if (payload.filters?.metric === 'toxicity_mean') {
          return refreshExecution.promise;
        }

        return Promise.resolve(
          buildExecutionResponse(
            queryId,
            payload.page || 1,
            'C00014',
            'Ammonia'
          )
        );
      }
    );

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    expect(await screen.findByText('Ammonia')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Ranking Metric'), 'toxicity_mean');

    expect(await screen.findByText('Refreshing results...')).toBeInTheDocument();
    expect(screen.getByText('Ammonia')).toBeInTheDocument();

    refreshExecution.resolve(
      buildExecutionResponse(
        'top_bioremediation_compounds',
        1,
        'C10984',
        'Cypermethrin'
      )
    );

    expect(await screen.findByText('Cypermethrin')).toBeInTheDocument();
  });

  it('shows the initial execution loading state before the first results arrive', async () => {
    const executionRequest = createDeferred<
      ReturnType<typeof buildExecutionResponse>
    >();
    mockExecuteGuidedQuery.mockReturnValue(executionRequest.promise);

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    expect(await screen.findByText('Executing query...')).toBeInTheDocument();
    expect(
      screen.getByText('Preparing guided results and visualizations.')
    ).toBeInTheDocument();

    executionRequest.resolve(
      buildExecutionResponse(
        'top_bioremediation_compounds',
        1,
        'C00014',
        'Ammonia'
      )
    );

    expect(await screen.findByText('Ammonia')).toBeInTheDocument();
  });

  it('surfaces partial options errors without blocking execution', async () => {
    mockGetGuidedQueryOptions.mockRejectedValue(
      new Error('Options service unavailable')
    );

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    expect(
      await screen.findByText(
        'Unable to refresh dependent filter options. Current filters remain available.'
      )
    ).toBeInTheDocument();
    expect(await screen.findByText('Ammonia')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockExecuteGuidedQuery).toHaveBeenCalledWith(
        'top_bioremediation_compounds',
        {
          page: 1,
          pageSize: 10,
          filters: {
            search_compound: 'Ammonia',
            metric: 'gene_count',
            endpoint: 'nr-ar',
          },
        }
      );
    });
  });

  it('shows execution errors when the guided query fails', async () => {
    mockExecuteGuidedQuery.mockRejectedValue(new Error('SQLite timeout'));

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    expect(
      await screen.findByText(
        'Unable to execute guided query: SQLite timeout'
      )
    ).toBeInTheDocument();
  });

  it('opens and closes the guided dialogs and accordion panels', async () => {
    const user = userEvent.setup();
    mockGetGuidedQueryRecipe.mockReturnValue({
      button_label: 'View Queries',
      title: 'Query Recipes',
      introduction: 'Static reproducibility recipes.',
      sqlite: {
        description: 'SQLite version',
        query: 'select * from guided_results;',
      },
      python: {
        description: 'Python version',
        script: 'print("guided")',
      },
      notes: ['Recipe note'],
    });

    render(<GuidedAnalysisPage onCompoundSelect={vi.fn()} />);

    const accordionButton = await screen.findByRole('button', {
      name: 'Show',
    });
    await user.click(accordionButton);

    expect(
      screen.getByText('Which compounds should be inspected first?')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View Methods' }));
    expect(
      await screen.findByRole('dialog', { name: 'Methods' })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close methods modal' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Methods' })
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'View Queries' }));
    expect(
      await screen.findByRole('dialog', { name: 'Query Recipes' })
    ).toBeInTheDocument();
    expect(screen.getByText('Static reproducibility recipes.')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Close query recipes modal' })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Query Recipes' })
      ).not.toBeInTheDocument();
    });
  });
});
