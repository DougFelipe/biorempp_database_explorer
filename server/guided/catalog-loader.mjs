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

