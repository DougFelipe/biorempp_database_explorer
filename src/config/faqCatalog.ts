import { parse as parseYaml } from 'yaml';
import rawFaqCatalog from './faq.en.yaml?raw';
import type { FaqCatalog, FaqItem, FaqLink, FaqNoteType, FaqSection } from '../types/faq';

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid FAQ config at ${path}: expected non-empty string`);
  }
  return value.trim();
}

function normalizeNoteType(value: unknown, path: string): FaqNoteType {
  const noteType = assertNonEmptyString(value, path);
  if (noteType !== 'info' && noteType !== 'warning' && noteType !== 'success') {
    throw new Error(`Invalid FAQ config at ${path}: expected one of info|warning|success`);
  }
  return noteType;
}

function normalizeLink(rawLink: unknown, path: string): FaqLink {
  if (!rawLink || typeof rawLink !== 'object' || Array.isArray(rawLink)) {
    throw new Error(`Invalid FAQ config at ${path}: expected object`);
  }

  const link = rawLink as Record<string, unknown>;
  return {
    label: assertNonEmptyString(link.label, `${path}.label`),
    url: assertNonEmptyString(link.url, `${path}.url`),
  };
}

function normalizeStringList(rawValue: unknown, path: string): string[] {
  if (!Array.isArray(rawValue)) {
    throw new Error(`Invalid FAQ config at ${path}: expected array`);
  }
  return rawValue.map((value, index) => assertNonEmptyString(value, `${path}[${index}]`));
}

function normalizeItem(rawItem: unknown, path: string): FaqItem {
  if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
    throw new Error(`Invalid FAQ config at ${path}: expected object`);
  }

  const item = rawItem as Record<string, unknown>;
  const normalized: FaqItem = {
    id: assertNonEmptyString(item.id, `${path}.id`),
    question: assertNonEmptyString(item.question, `${path}.question`),
    answer: assertNonEmptyString(item.answer, `${path}.answer`),
  };

  if (item.bullets !== undefined) {
    normalized.bullets = normalizeStringList(item.bullets, `${path}.bullets`);
  }

  if (item.note !== undefined) {
    if (!item.note || typeof item.note !== 'object' || Array.isArray(item.note)) {
      throw new Error(`Invalid FAQ config at ${path}.note: expected object`);
    }
    const note = item.note as Record<string, unknown>;
    normalized.note = {
      type: normalizeNoteType(note.type, `${path}.note.type`),
      text: assertNonEmptyString(note.text, `${path}.note.text`),
    };
  }

  if (item.links !== undefined) {
    if (!Array.isArray(item.links)) {
      throw new Error(`Invalid FAQ config at ${path}.links: expected array`);
    }
    normalized.links = item.links.map((rawLink, index) => normalizeLink(rawLink, `${path}.links[${index}]`));
  }

  if (item.code_example !== undefined) {
    normalized.code_example = assertNonEmptyString(item.code_example, `${path}.code_example`);
  }

  if (item.tags !== undefined) {
    normalized.tags = normalizeStringList(item.tags, `${path}.tags`);
  }

  return normalized;
}

function normalizeSection(rawSection: unknown, path: string): FaqSection {
  if (!rawSection || typeof rawSection !== 'object' || Array.isArray(rawSection)) {
    throw new Error(`Invalid FAQ config at ${path}: expected object`);
  }

  const section = rawSection as Record<string, unknown>;
  const itemsRaw = section.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    throw new Error(`Invalid FAQ config at ${path}.items: expected non-empty array`);
  }

  return {
    id: assertNonEmptyString(section.id, `${path}.id`),
    title: assertNonEmptyString(section.title, `${path}.title`),
    items: itemsRaw.map((item, index) => normalizeItem(item, `${path}.items[${index}]`)),
  };
}

function loadFaqCatalog(): FaqCatalog {
  let parsed: unknown;
  try {
    parsed = parseYaml(rawFaqCatalog);
  } catch (error) {
    throw new Error(
      `Invalid FAQ config YAML syntax: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid FAQ config: root must be an object');
  }

  const root = parsed as Record<string, unknown>;
  const sectionsRaw = root.sections;
  if (!Array.isArray(sectionsRaw) || sectionsRaw.length === 0) {
    throw new Error('Invalid FAQ config: sections must be a non-empty array');
  }

  const sections = sectionsRaw.map((section, index) => normalizeSection(section, `sections[${index}]`));

  const sectionIdSet = new Set<string>();
  const itemIdSet = new Set<string>();
  for (const section of sections) {
    if (sectionIdSet.has(section.id)) {
      throw new Error(`Invalid FAQ config: duplicated section id "${section.id}"`);
    }
    sectionIdSet.add(section.id);
    for (const item of section.items) {
      if (itemIdSet.has(item.id)) {
        throw new Error(`Invalid FAQ config: duplicated item id "${item.id}"`);
      }
      itemIdSet.add(item.id);
    }
  }

  return {
    version: assertNonEmptyString(root.version, 'version'),
    language: assertNonEmptyString(root.language, 'language'),
    title: assertNonEmptyString(root.title, 'title'),
    intro: assertNonEmptyString(root.intro, 'intro'),
    sections,
  };
}

export const FAQ_CATALOG = loadFaqCatalog();
