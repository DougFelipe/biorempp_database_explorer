import fs from 'node:fs';
import path from 'node:path';

function assertObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

function assertString(value, message) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(message);
  }
}

function assertArray(value, message) {
  if (!Array.isArray(value)) {
    throw new Error(message);
  }
}

function validateUseCaseDescription(value, queryId) {
  assertObject(value, `guided query ${queryId} use_case_description must be an object`);
  assertString(
    value.scientific_question,
    `guided query ${queryId} use_case_description.scientific_question is required`
  );
  assertString(value.description, `guided query ${queryId} use_case_description.description is required`);
  assertArray(value.interpretation, `guided query ${queryId} use_case_description.interpretation must be an array`);
  if (value.interpretation.length === 0) {
    throw new Error(`guided query ${queryId} use_case_description.interpretation must include at least one item`);
  }
  for (let idx = 0; idx < value.interpretation.length; idx += 1) {
    assertString(
      value.interpretation[idx],
      `guided query ${queryId} use_case_description.interpretation[${idx}] must be a non-empty string`
    );
  }
  if (value.visual_elements !== undefined) {
    assertArray(
      value.visual_elements,
      `guided query ${queryId} use_case_description.visual_elements must be an array`
    );
    for (let idx = 0; idx < value.visual_elements.length; idx += 1) {
      const visualElement = value.visual_elements[idx];
      assertObject(
        visualElement,
        `guided query ${queryId} use_case_description.visual_elements[${idx}] must be an object`
      );
      assertString(
        visualElement.title,
        `guided query ${queryId} use_case_description.visual_elements[${idx}].title is required`
      );
      assertString(
        visualElement.description,
        `guided query ${queryId} use_case_description.visual_elements[${idx}].description is required`
      );
    }
  }
}

function validateMethodsModal(value, queryId) {
  assertObject(value, `guided query ${queryId} methods_modal must be an object`);
  assertString(value.button_label, `guided query ${queryId} methods_modal.button_label is required`);
  assertString(value.title, `guided query ${queryId} methods_modal.title is required`);
  assertString(value.introduction, `guided query ${queryId} methods_modal.introduction is required`);
  assertArray(value.steps, `guided query ${queryId} methods_modal.steps must be an array`);
  if (value.steps.length === 0) {
    throw new Error(`guided query ${queryId} methods_modal.steps must include at least one item`);
  }

  for (let idx = 0; idx < value.steps.length; idx += 1) {
    const step = value.steps[idx];
    assertObject(step, `guided query ${queryId} methods_modal.steps[${idx}] must be an object`);
    assertString(step.title, `guided query ${queryId} methods_modal.steps[${idx}].title is required`);
    assertString(
      step.description,
      `guided query ${queryId} methods_modal.steps[${idx}].description is required`
    );
    if (step.bullets !== undefined) {
      assertArray(step.bullets, `guided query ${queryId} methods_modal.steps[${idx}].bullets must be an array`);
      for (let bulletIdx = 0; bulletIdx < step.bullets.length; bulletIdx += 1) {
        assertString(
          step.bullets[bulletIdx],
          `guided query ${queryId} methods_modal.steps[${idx}].bullets[${bulletIdx}] must be a non-empty string`
        );
      }
    }
  }

  if (value.footer_note !== undefined) {
    assertString(value.footer_note, `guided query ${queryId} methods_modal.footer_note must be a non-empty string`);
  }
}

function validateCatalog(catalog) {
  assertObject(catalog, 'guided catalog must be an object');
  assertString(catalog.version, 'guided catalog version is required');
  assertString(catalog.title, 'guided catalog title is required');
  assertArray(catalog.categories, 'guided catalog categories must be an array');
  assertArray(catalog.queries, 'guided catalog queries must be an array');

  for (const category of catalog.categories) {
    assertObject(category, 'guided category must be an object');
    assertString(category.id, 'guided category id is required');
    assertString(category.label, 'guided category label is required');
  }

  for (const query of catalog.queries) {
    assertObject(query, 'guided query must be an object');
    assertString(query.id, 'guided query id is required');
    assertString(query.category, `guided query ${query.id} category is required`);
    assertString(query.title, `guided query ${query.id} title is required`);
    assertString(query.question, `guided query ${query.id} question is required`);
    assertString(query.description, `guided query ${query.id} description is required`);
    assertString(query.dataset, `guided query ${query.id} dataset is required`);
    assertString(query.executor, `guided query ${query.id} executor is required`);
    validateUseCaseDescription(query.use_case_description, query.id);
    validateMethodsModal(query.methods_modal, query.id);
    if (query.filters !== undefined) {
      assertArray(query.filters, `guided query ${query.id} filters must be an array`);
    }
    if (query.summary_cards !== undefined) {
      assertArray(query.summary_cards, `guided query ${query.id} summary_cards must be an array`);
    }
    if (query.visualizations !== undefined) {
      assertArray(query.visualizations, `guided query ${query.id} visualizations must be an array`);
    }
    if (query.insights !== undefined) {
      assertArray(query.insights, `guided query ${query.id} insights must be an array`);
    }
  }

  return catalog;
}

export function createGuidedCatalogLoader({ projectRoot }) {
  const filePath = path.join(projectRoot, 'server', 'generated', 'guided', 'catalog.json');
  let cache = null;
  let cacheMtimeMs = 0;

  function loadFresh() {
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Guided catalog not found at ${path.relative(projectRoot, filePath)}. Run "npm run compile:guided".`
      );
    }

    const stat = fs.statSync(filePath);
    if (cache && stat.mtimeMs === cacheMtimeMs) {
      return cache;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    const validated = validateCatalog(parsed);
    cache = validated;
    cacheMtimeMs = stat.mtimeMs;
    return validated;
  }

  return {
    getCatalog() {
      return loadFresh();
    },
    getQueryOrThrow(queryId) {
      const catalog = loadFresh();
      const query = catalog.queries.find((item) => item.id === queryId);
      if (!query) {
        throw new Error(`Guided query "${queryId}" not found`);
      }
      return query;
    },
  };
}
