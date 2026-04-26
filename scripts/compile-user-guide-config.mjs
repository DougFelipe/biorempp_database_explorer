import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const userGuidePath = path.join(projectRoot, 'src', 'config', 'user-guide.page.yaml');

const EXPECTED_CATEGORY_IDS = [
  'compounds',
  'compound-classes',
  'genes',
  'pathways',
  'toxicity',
  'guided-analysis',
];

function fail(message) {
  throw new Error(`user-guide-config: ${message}`);
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
  return value.trim();
}

function assertArray(value, context) {
  if (!Array.isArray(value)) {
    fail(`${context} must be an array`);
  }
}

function assertStringArray(value, context) {
  assertArray(value, context);
  if (value.length === 0) {
    fail(`${context} must contain at least one item`);
  }
  value.forEach((entry, index) => assertString(entry, `${context}[${index}]`));
}

function readYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing file: ${path.relative(projectRoot, filePath)}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return parseYaml(raw);
  } catch (error) {
    fail(`invalid yaml in ${path.relative(projectRoot, filePath)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateUserGuide(root) {
  assertObject(root, 'user-guide.page.yaml');
  assertString(root.version, 'user-guide.page.yaml version');
  assertString(root.page_title, 'user-guide.page.yaml page_title');
  assertString(root.page_subtitle, 'user-guide.page.yaml page_subtitle');
  assertStringArray(root.intro_paragraphs, 'user-guide.page.yaml intro_paragraphs');
  assertString(root.access_note, 'user-guide.page.yaml access_note');

  assertObject(root.workflow, 'user-guide.page.yaml workflow');
  assertString(root.workflow.title, 'user-guide.page.yaml workflow.title');
  assertStringArray(root.workflow.steps, 'user-guide.page.yaml workflow.steps');

  assertObject(root.quick_nav, 'user-guide.page.yaml quick_nav');
  assertString(root.quick_nav.title, 'user-guide.page.yaml quick_nav.title');
  assertString(root.quick_nav.description, 'user-guide.page.yaml quick_nav.description');

  assertArray(root.categories, 'user-guide.page.yaml categories');
  if (root.categories.length !== EXPECTED_CATEGORY_IDS.length) {
    fail(
      `user-guide.page.yaml categories must contain exactly ${EXPECTED_CATEGORY_IDS.length} items, found ${root.categories.length}`
    );
  }

  const seenIds = new Set();
  root.categories.forEach((category, index) => {
    const categoryPath = `user-guide.page.yaml categories[${index}]`;
    assertObject(category, categoryPath);

    const id = assertString(category.id, `${categoryPath}.id`);
    if (!EXPECTED_CATEGORY_IDS.includes(id)) {
      fail(`${categoryPath}.id must be one of ${EXPECTED_CATEGORY_IDS.join('|')}`);
    }
    if (id !== EXPECTED_CATEGORY_IDS[index]) {
      fail(`${categoryPath}.id must be "${EXPECTED_CATEGORY_IDS[index]}" to preserve document order`);
    }
    if (seenIds.has(id)) {
      fail(`duplicated category id: ${id}`);
    }
    seenIds.add(id);

    const targetView = assertString(category.target_view, `${categoryPath}.target_view`);
    if (!EXPECTED_CATEGORY_IDS.includes(targetView)) {
      fail(`${categoryPath}.target_view must be one of ${EXPECTED_CATEGORY_IDS.join('|')}`);
    }

    assertString(category.label, `${categoryPath}.label`);
    assertString(category.eyebrow, `${categoryPath}.eyebrow`);
    assertString(category.summary, `${categoryPath}.summary`);
    assertString(category.purpose, `${categoryPath}.purpose`);
    assertStringArray(category.capabilities, `${categoryPath}.capabilities`);
    assertStringArray(category.filters, `${categoryPath}.filters`);
    assertStringArray(category.outputs, `${categoryPath}.outputs`);
    assertStringArray(category.detail_views, `${categoryPath}.detail_views`);
    assertStringArray(category.best_for, `${categoryPath}.best_for`);
    assertString(category.cta_label, `${categoryPath}.cta_label`);
  });

  assertString(root.closing_note, 'user-guide.page.yaml closing_note');

  return {
    categoryCount: root.categories.length,
    stepCount: root.workflow.steps.length,
  };
}

try {
  const root = readYaml(userGuidePath);
  const { categoryCount, stepCount } = validateUserGuide(root);
  console.log(
    `user-guide-config: validated ${categoryCount} categories and ${stepCount} workflow steps in ${path.relative(projectRoot, userGuidePath)}`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
