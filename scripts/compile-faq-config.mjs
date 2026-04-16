import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const faqPath = path.join(projectRoot, 'src', 'config', 'faq.en.yaml');

const VALID_NOTE_TYPES = new Set(['info', 'warning', 'success']);
const EXPECTED_SECTION_COUNT = 11;

function fail(message) {
  throw new Error(`faq-config: ${message}`);
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

function validateFaqCatalog(root) {
  assertObject(root, 'faq.en.yaml');
  assertString(root.version, 'faq.en.yaml version');
  assertString(root.language, 'faq.en.yaml language');
  assertString(root.title, 'faq.en.yaml title');
  assertString(root.intro, 'faq.en.yaml intro');
  assertArray(root.sections, 'faq.en.yaml sections');

  if (root.sections.length !== EXPECTED_SECTION_COUNT) {
    fail(`faq.en.yaml sections must contain exactly ${EXPECTED_SECTION_COUNT} sections, found ${root.sections.length}`);
  }

  const sectionIds = new Set();
  const itemIds = new Set();
  let questionCount = 0;

  root.sections.forEach((section, sectionIndex) => {
    const sectionPath = `faq.en.yaml sections[${sectionIndex}]`;
    assertObject(section, sectionPath);
    const sectionId = assertString(section.id, `${sectionPath}.id`);
    assertString(section.title, `${sectionPath}.title`);
    assertArray(section.items, `${sectionPath}.items`);

    if (section.items.length === 0) {
      fail(`${sectionPath}.items must contain at least one item`);
    }
    if (sectionIds.has(sectionId)) {
      fail(`duplicated section id: ${sectionId}`);
    }
    sectionIds.add(sectionId);

    section.items.forEach((item, itemIndex) => {
      const itemPath = `${sectionPath}.items[${itemIndex}]`;
      assertObject(item, itemPath);
      const itemId = assertString(item.id, `${itemPath}.id`);
      assertString(item.question, `${itemPath}.question`);
      assertString(item.answer, `${itemPath}.answer`);

      if (itemIds.has(itemId)) {
        fail(`duplicated item id: ${itemId}`);
      }
      itemIds.add(itemId);
      questionCount += 1;

      if (item.bullets !== undefined) {
        assertArray(item.bullets, `${itemPath}.bullets`);
        item.bullets.forEach((bullet, bulletIndex) => {
          assertString(bullet, `${itemPath}.bullets[${bulletIndex}]`);
        });
      }

      if (item.note !== undefined) {
        assertObject(item.note, `${itemPath}.note`);
        const noteType = assertString(item.note.type, `${itemPath}.note.type`);
        if (!VALID_NOTE_TYPES.has(noteType)) {
          fail(`${itemPath}.note.type must be one of info|warning|success`);
        }
        assertString(item.note.text, `${itemPath}.note.text`);
      }

      if (item.links !== undefined) {
        assertArray(item.links, `${itemPath}.links`);
        item.links.forEach((link, linkIndex) => {
          assertObject(link, `${itemPath}.links[${linkIndex}]`);
          assertString(link.label, `${itemPath}.links[${linkIndex}].label`);
          assertString(link.url, `${itemPath}.links[${linkIndex}].url`);
        });
      }

      if (item.code_example !== undefined) {
        assertString(item.code_example, `${itemPath}.code_example`);
      }

      if (item.tags !== undefined) {
        assertArray(item.tags, `${itemPath}.tags`);
        item.tags.forEach((tag, tagIndex) => {
          assertString(tag, `${itemPath}.tags[${tagIndex}]`);
        });
      }
    });
  });

  if (questionCount < 30 || questionCount > 40) {
    fail(`faq.en.yaml question count must stay within 30-40 for medium density, found ${questionCount}`);
  }

  return { sectionCount: root.sections.length, questionCount };
}

try {
  const root = readYaml(faqPath);
  const { sectionCount, questionCount } = validateFaqCatalog(root);
  console.log(
    `faq-config: validated ${questionCount} questions across ${sectionCount} sections in ${path.relative(projectRoot, faqPath)}`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
