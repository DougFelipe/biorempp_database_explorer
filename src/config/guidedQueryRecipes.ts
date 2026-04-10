import { parse as parseYaml } from 'yaml';
import rawRecipes from './guided-query-recipes.yaml?raw';
import type { GuidedQueryRecipe, GuidedQueryRecipeCatalog } from '../types/frontConfig';

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid guided query recipes config at ${path}: expected non-empty string`);
  }
  return value.trim();
}

function normalizeRecipe(rawRecipe: unknown, queryId: string): GuidedQueryRecipe {
  if (!rawRecipe || typeof rawRecipe !== 'object' || Array.isArray(rawRecipe)) {
    throw new Error(`Invalid guided query recipes config at queries.${queryId}: expected object`);
  }
  const recipe = rawRecipe as Record<string, unknown>;
  const sqlite = recipe.sqlite;
  const python = recipe.python;

  if (!sqlite || typeof sqlite !== 'object' || Array.isArray(sqlite)) {
    throw new Error(`Invalid guided query recipes config at queries.${queryId}.sqlite: expected object`);
  }
  if (!python || typeof python !== 'object' || Array.isArray(python)) {
    throw new Error(`Invalid guided query recipes config at queries.${queryId}.python: expected object`);
  }

  const sqliteBlock = sqlite as Record<string, unknown>;
  const pythonBlock = python as Record<string, unknown>;
  const notesRaw = recipe.notes;
  const notes =
    Array.isArray(notesRaw) && notesRaw.length > 0
      ? notesRaw.map((value, idx) => assertNonEmptyString(value, `queries.${queryId}.notes[${idx}]`))
      : undefined;

  return {
    button_label: assertNonEmptyString(recipe.button_label, `queries.${queryId}.button_label`),
    title: assertNonEmptyString(recipe.title, `queries.${queryId}.title`),
    introduction: assertNonEmptyString(recipe.introduction, `queries.${queryId}.introduction`),
    sqlite: {
      description: assertNonEmptyString(sqliteBlock.description, `queries.${queryId}.sqlite.description`),
      query: assertNonEmptyString(sqliteBlock.query, `queries.${queryId}.sqlite.query`),
    },
    python: {
      description: assertNonEmptyString(pythonBlock.description, `queries.${queryId}.python.description`),
      script: assertNonEmptyString(pythonBlock.script, `queries.${queryId}.python.script`),
    },
    notes,
  };
}

function loadGuidedQueryRecipesCatalog(): GuidedQueryRecipeCatalog {
  const raw = parseYaml(rawRecipes);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid guided query recipes config: root must be an object');
  }
  const root = raw as Record<string, unknown>;
  const queryMapRaw = root.queries;
  if (!queryMapRaw || typeof queryMapRaw !== 'object' || Array.isArray(queryMapRaw)) {
    throw new Error('Invalid guided query recipes config: queries must be an object');
  }

  const normalizedQueries: Record<string, GuidedQueryRecipe> = {};
  for (const [queryId, recipe] of Object.entries(queryMapRaw as Record<string, unknown>)) {
    normalizedQueries[queryId] = normalizeRecipe(recipe, queryId);
  }

  return {
    version: assertNonEmptyString(root.version, 'version'),
    note: typeof root.note === 'string' ? root.note.trim() : undefined,
    queries: normalizedQueries,
  };
}

export const GUIDED_QUERY_RECIPES_CATALOG = loadGuidedQueryRecipesCatalog();

export function getGuidedQueryRecipe(queryId: string): GuidedQueryRecipe | undefined {
  return GUIDED_QUERY_RECIPES_CATALOG.queries[queryId];
}
