import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const configRoot = path.join(projectRoot, 'config', 'guided-analysis');
const catalogPath = path.join(configRoot, 'catalog.yaml');
const queriesDir = path.join(configRoot, 'queries');
const outputDir = path.join(projectRoot, 'server', 'generated', 'guided');
const outputPath = path.join(outputDir, 'catalog.json');

const VALID_FILTER_TYPES = new Set(['select', 'number_range', 'search', 'dependent_select', 'toggle']);
const VALID_PROVIDER_TYPES = new Set(['meta_endpoint', 'static', 'query_derived']);
const VALID_VIS_TYPES = new Set(['horizontal_bar', 'scatter_quadrant', 'heatmap_matrix', 'table']);
const VALID_COLUMN_TYPES = new Set(['text', 'number', 'compound_link']);
const MIN_INTERPRETATION_STATEMENT_LENGTH = 20;

function fail(message) {
  throw new Error(`guided-config: ${message}`);
}

function readYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing file: ${path.relative(projectRoot, filePath)}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return parseYaml(content);
  } catch (error) {
    fail(`invalid yaml in ${path.relative(projectRoot, filePath)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertObject(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${context} must be an object`);
  }
}

function assertString(value, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${context} must be a non-empty string`);
  }
}

function assertArray(value, context) {
  if (!Array.isArray(value)) {
    fail(`${context} must be an array`);
  }
}

function normalizeFilter(filter, queryId, idx) {
  assertObject(filter, `queries/${queryId}.yaml filters[${idx}]`);
  assertString(filter.id, `queries/${queryId}.yaml filters[${idx}].id`);
  assertString(filter.type, `queries/${queryId}.yaml filters[${idx}].type`);
  assertString(filter.label, `queries/${queryId}.yaml filters[${idx}].label`);

  if (!VALID_FILTER_TYPES.has(filter.type)) {
    fail(`queries/${queryId}.yaml filters[${idx}].type invalid: ${filter.type}`);
  }

  const normalized = {
    id: filter.id,
    type: filter.type,
    label: filter.label,
    placeholder: typeof filter.placeholder === 'string' ? filter.placeholder : undefined,
    depends_on: typeof filter.depends_on === 'string' ? filter.depends_on : undefined,
    min: typeof filter.min === 'number' ? filter.min : undefined,
    max: typeof filter.max === 'number' ? filter.max : undefined,
    step: typeof filter.step === 'number' ? filter.step : undefined,
  };

  if (filter.provider !== undefined) {
    assertObject(filter.provider, `queries/${queryId}.yaml filters[${idx}].provider`);
    assertString(filter.provider.type, `queries/${queryId}.yaml filters[${idx}].provider.type`);
    if (!VALID_PROVIDER_TYPES.has(filter.provider.type)) {
      fail(`queries/${queryId}.yaml filters[${idx}].provider.type invalid: ${filter.provider.type}`);
    }

    const provider = {
      type: filter.provider.type,
      endpoint: undefined,
      source: undefined,
      include_mean_option: Boolean(filter.provider.include_mean_option),
      mean_option_label:
        typeof filter.provider.mean_option_label === 'string'
          ? filter.provider.mean_option_label
          : undefined,
      options: undefined,
    };

    if (provider.type === 'meta_endpoint') {
      assertString(filter.provider.endpoint, `queries/${queryId}.yaml filters[${idx}].provider.endpoint`);
      provider.endpoint = filter.provider.endpoint;
    }

    if (provider.type === 'query_derived') {
      assertString(filter.provider.source, `queries/${queryId}.yaml filters[${idx}].provider.source`);
      provider.source = filter.provider.source;
    }

    if (provider.type === 'static') {
      assertArray(filter.provider.options, `queries/${queryId}.yaml filters[${idx}].provider.options`);
      provider.options = filter.provider.options.map((option, optionIdx) => {
        assertObject(option, `queries/${queryId}.yaml filters[${idx}].provider.options[${optionIdx}]`);
        assertString(option.value, `queries/${queryId}.yaml filters[${idx}].provider.options[${optionIdx}].value`);
        assertString(option.label, `queries/${queryId}.yaml filters[${idx}].provider.options[${optionIdx}].label`);
        return {
          value: option.value,
          label: option.label,
        };
      });
    }

    normalized.provider = provider;
  }

  return normalized;
}

function normalizeSummaryCard(card, queryId, idx) {
  assertObject(card, `queries/${queryId}.yaml summary_cards[${idx}]`);
  assertString(card.id, `queries/${queryId}.yaml summary_cards[${idx}].id`);
  assertString(card.label, `queries/${queryId}.yaml summary_cards[${idx}].label`);
  assertString(card.value_key, `queries/${queryId}.yaml summary_cards[${idx}].value_key`);
  return {
    id: card.id,
    label: card.label,
    value_key: card.value_key,
    hint: typeof card.hint === 'string' ? card.hint : undefined,
  };
}

function normalizeVisualization(vis, queryId, idx) {
  assertObject(vis, `queries/${queryId}.yaml visualizations[${idx}]`);
  assertString(vis.id, `queries/${queryId}.yaml visualizations[${idx}].id`);
  assertString(vis.type, `queries/${queryId}.yaml visualizations[${idx}].type`);
  assertString(vis.title, `queries/${queryId}.yaml visualizations[${idx}].title`);
  assertString(vis.data_key, `queries/${queryId}.yaml visualizations[${idx}].data_key`);
  if (!VALID_VIS_TYPES.has(vis.type)) {
    fail(`queries/${queryId}.yaml visualizations[${idx}].type invalid: ${vis.type}`);
  }

  return {
    id: vis.id,
    type: vis.type,
    title: vis.title,
    subtitle: typeof vis.subtitle === 'string' ? vis.subtitle : undefined,
    data_key: vis.data_key,
  };
}

function normalizeTable(table, queryId) {
  assertObject(table, `queries/${queryId}.yaml table`);
  assertString(table.id, `queries/${queryId}.yaml table.id`);
  assertString(table.title, `queries/${queryId}.yaml table.title`);
  assertArray(table.columns, `queries/${queryId}.yaml table.columns`);

  const columns = table.columns.map((column, idx) => {
    assertObject(column, `queries/${queryId}.yaml table.columns[${idx}]`);
    assertString(column.id, `queries/${queryId}.yaml table.columns[${idx}].id`);
    assertString(column.label, `queries/${queryId}.yaml table.columns[${idx}].label`);
    const type = typeof column.type === 'string' ? column.type : 'text';
    if (!VALID_COLUMN_TYPES.has(type)) {
      fail(`queries/${queryId}.yaml table.columns[${idx}].type invalid: ${type}`);
    }
    return {
      id: column.id,
      label: column.label,
      type,
    };
  });

  return {
    id: table.id,
    title: table.title,
    subtitle: typeof table.subtitle === 'string' ? table.subtitle : undefined,
    row_click_field: typeof table.row_click_field === 'string' ? table.row_click_field : undefined,
    empty_message: typeof table.empty_message === 'string' ? table.empty_message : undefined,
    columns,
  };
}

function normalizeInsight(insight, queryId, idx) {
  assertObject(insight, `queries/${queryId}.yaml insights[${idx}]`);
  assertString(insight.id, `queries/${queryId}.yaml insights[${idx}].id`);
  assertString(insight.text, `queries/${queryId}.yaml insights[${idx}].text`);
  return {
    id: insight.id,
    text: insight.text,
  };
}

function normalizeUseCaseDescription(rawUseCaseDescription, queryId) {
  assertObject(rawUseCaseDescription, `queries/${queryId}.yaml use_case_description`);

  assertString(
    rawUseCaseDescription.scientific_question,
    `queries/${queryId}.yaml use_case_description.scientific_question`
  );
  assertString(rawUseCaseDescription.description, `queries/${queryId}.yaml use_case_description.description`);
  assertArray(rawUseCaseDescription.interpretation, `queries/${queryId}.yaml use_case_description.interpretation`);

  const interpretation = rawUseCaseDescription.interpretation.map((item, idx) => {
    assertString(
      item,
      `queries/${queryId}.yaml use_case_description.interpretation[${idx}]`
    );
    const trimmed = item.trim();
    if (trimmed.length < MIN_INTERPRETATION_STATEMENT_LENGTH) {
      fail(
        `queries/${queryId}.yaml use_case_description.interpretation[${idx}] must have at least ${MIN_INTERPRETATION_STATEMENT_LENGTH} characters`
      );
    }
    return trimmed;
  });

  if (interpretation.length === 0) {
    fail(`queries/${queryId}.yaml use_case_description.interpretation must include at least one item`);
  }

  let visualElements;
  if (rawUseCaseDescription.visual_elements !== undefined) {
    assertArray(rawUseCaseDescription.visual_elements, `queries/${queryId}.yaml use_case_description.visual_elements`);
    visualElements = rawUseCaseDescription.visual_elements.map((item, idx) => {
      assertObject(item, `queries/${queryId}.yaml use_case_description.visual_elements[${idx}]`);
      assertString(
        item.title,
        `queries/${queryId}.yaml use_case_description.visual_elements[${idx}].title`
      );
      assertString(
        item.description,
        `queries/${queryId}.yaml use_case_description.visual_elements[${idx}].description`
      );
      return {
        title: item.title.trim(),
        description: item.description.trim(),
      };
    });
  }

  return {
    scientific_question: rawUseCaseDescription.scientific_question.trim(),
    description: rawUseCaseDescription.description.trim(),
    visual_elements: visualElements,
    interpretation,
  };
}

function normalizeMethodsModal(rawMethodsModal, queryId) {
  assertObject(rawMethodsModal, `queries/${queryId}.yaml methods_modal`);
  assertString(rawMethodsModal.button_label, `queries/${queryId}.yaml methods_modal.button_label`);
  assertString(rawMethodsModal.title, `queries/${queryId}.yaml methods_modal.title`);
  assertString(rawMethodsModal.introduction, `queries/${queryId}.yaml methods_modal.introduction`);
  assertArray(rawMethodsModal.steps, `queries/${queryId}.yaml methods_modal.steps`);

  if (rawMethodsModal.steps.length === 0) {
    fail(`queries/${queryId}.yaml methods_modal.steps must include at least one step`);
  }

  const steps = rawMethodsModal.steps.map((step, idx) => {
    assertObject(step, `queries/${queryId}.yaml methods_modal.steps[${idx}]`);
    assertString(step.title, `queries/${queryId}.yaml methods_modal.steps[${idx}].title`);
    assertString(step.description, `queries/${queryId}.yaml methods_modal.steps[${idx}].description`);

    let bullets;
    if (step.bullets !== undefined) {
      assertArray(step.bullets, `queries/${queryId}.yaml methods_modal.steps[${idx}].bullets`);
      bullets = step.bullets.map((bullet, bulletIdx) => {
        assertString(
          bullet,
          `queries/${queryId}.yaml methods_modal.steps[${idx}].bullets[${bulletIdx}]`
        );
        return bullet.trim();
      });
    }

    return {
      title: step.title.trim(),
      description: step.description.trim(),
      bullets,
    };
  });

  return {
    button_label: rawMethodsModal.button_label.trim(),
    title: rawMethodsModal.title.trim(),
    introduction: rawMethodsModal.introduction.trim(),
    steps,
    footer_note: typeof rawMethodsModal.footer_note === 'string' ? rawMethodsModal.footer_note.trim() : undefined,
  };
}

function normalizeQuery(rawQuery, sourcePath) {
  assertObject(rawQuery, sourcePath);

  assertString(rawQuery.id, `${sourcePath}.id`);
  assertString(rawQuery.category, `${sourcePath}.category`);
  assertString(rawQuery.title, `${sourcePath}.title`);
  assertString(rawQuery.question, `${sourcePath}.question`);
  assertString(rawQuery.description, `${sourcePath}.description`);
  assertString(rawQuery.dataset, `${sourcePath}.dataset`);
  assertString(rawQuery.executor, `${sourcePath}.executor`);

  const queryId = rawQuery.id;

  const filters = Array.isArray(rawQuery.filters)
    ? rawQuery.filters.map((filter, idx) => normalizeFilter(filter, queryId, idx))
    : [];
  const filterIds = new Set(filters.map((filter) => filter.id));
  if (filterIds.size !== filters.length) {
    fail(`queries/${queryId}.yaml has duplicated filter ids`);
  }

  const summaryCards = Array.isArray(rawQuery.summary_cards)
    ? rawQuery.summary_cards.map((card, idx) => normalizeSummaryCard(card, queryId, idx))
    : [];

  const visualizations = Array.isArray(rawQuery.visualizations)
    ? rawQuery.visualizations.map((vis, idx) => normalizeVisualization(vis, queryId, idx))
    : [];

  const table = rawQuery.table ? normalizeTable(rawQuery.table, queryId) : null;
  const insights = Array.isArray(rawQuery.insights)
    ? rawQuery.insights.map((insight, idx) => normalizeInsight(insight, queryId, idx))
    : [];
  const useCaseDescription = normalizeUseCaseDescription(rawQuery.use_case_description, queryId);
  const methodsModal = normalizeMethodsModal(rawQuery.methods_modal, queryId);

  return {
    id: queryId,
    category: rawQuery.category,
    title: rawQuery.title,
    question: rawQuery.question,
    description: rawQuery.description,
    dataset: rawQuery.dataset,
    executor: rawQuery.executor,
    defaults: rawQuery.defaults && typeof rawQuery.defaults === 'object' ? rawQuery.defaults : {},
    executor_config:
      rawQuery.executor_config && typeof rawQuery.executor_config === 'object' ? rawQuery.executor_config : {},
    filters,
    use_case_description: useCaseDescription,
    methods_modal: methodsModal,
    summary_cards: summaryCards,
    visualizations,
    table,
    insights,
  };
}

function main() {
  const catalog = readYaml(catalogPath);
  assertObject(catalog, 'catalog.yaml');
  assertString(catalog.version, 'catalog.yaml version');
  assertString(catalog.title, 'catalog.yaml title');
  assertArray(catalog.categories, 'catalog.yaml categories');
  assertArray(catalog.query_order, 'catalog.yaml query_order');

  const categories = catalog.categories.map((category, idx) => {
    assertObject(category, `catalog.yaml categories[${idx}]`);
    assertString(category.id, `catalog.yaml categories[${idx}].id`);
    assertString(category.label, `catalog.yaml categories[${idx}].label`);
    return {
      id: category.id,
      label: category.label,
    };
  });

  const queryFiles = fs
    .readdirSync(queriesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (queryFiles.length === 0) {
    fail('no query yaml files found in config/guided-analysis/queries');
  }

  const queryMap = new Map();
  for (const fileName of queryFiles) {
    const filePath = path.join(queriesDir, fileName);
    const rawQuery = readYaml(filePath);
    const normalized = normalizeQuery(rawQuery, `queries/${fileName}`);
    if (queryMap.has(normalized.id)) {
      fail(`duplicated query id: ${normalized.id}`);
    }
    queryMap.set(normalized.id, normalized);
  }

  const orderedQueries = catalog.query_order.map((queryId, idx) => {
    assertString(queryId, `catalog.yaml query_order[${idx}]`);
    const query = queryMap.get(queryId);
    if (!query) {
      fail(`catalog query_order references missing query id: ${queryId}`);
    }
    return query;
  });

  const knownCategoryIds = new Set(categories.map((category) => category.id));
  for (const query of orderedQueries) {
    if (!knownCategoryIds.has(query.category)) {
      fail(`query ${query.id} references unknown category: ${query.category}`);
    }
  }

  if (orderedQueries.length !== queryMap.size) {
    const missing = [...queryMap.keys()].filter((queryId) => !catalog.query_order.includes(queryId));
    fail(`catalog query_order is missing queries: ${missing.join(', ')}`);
  }

  const output = {
    version: catalog.version,
    title: catalog.title,
    categories,
    queries: orderedQueries,
    generated_at: new Date().toISOString(),
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(
    `guided-config: compiled ${orderedQueries.length} queries to ${path.relative(projectRoot, outputPath)}`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
