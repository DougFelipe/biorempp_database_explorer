import { parse as parseYaml } from 'yaml';
import rawCatalog from './downloads.zenodo.yaml?raw';
import type { ExternalDownloadCatalog, ExternalDownloadItem } from '../types/frontConfig';

function assertNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid downloads config at ${path}: expected non-empty string`);
  }
  return value.trim();
}

function normalizeDownloadItem(rawItem: unknown, index: number): ExternalDownloadItem {
  if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
    throw new Error(`Invalid downloads config at items[${index}]: expected object`);
  }
  const item = rawItem as Record<string, unknown>;
  return {
    id: assertNonEmptyString(item.id, `items[${index}].id`),
    label: assertNonEmptyString(item.label, `items[${index}].label`),
    format: assertNonEmptyString(item.format, `items[${index}].format`),
    url: assertNonEmptyString(item.url, `items[${index}].url`),
    version: assertNonEmptyString(item.version, `items[${index}].version`),
    size: typeof item.size === 'string' ? item.size.trim() : undefined,
    updated_at: typeof item.updated_at === 'string' ? item.updated_at.trim() : undefined,
    source: assertNonEmptyString(item.source, `items[${index}].source`),
  };
}

function loadDownloadCatalog(): ExternalDownloadCatalog {
  const raw = parseYaml(rawCatalog);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid downloads config: root must be an object');
  }
  const root = raw as Record<string, unknown>;
  const items = root.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Invalid downloads config: items must be a non-empty array');
  }

  return {
    version: assertNonEmptyString(root.version, 'version'),
    title: assertNonEmptyString(root.title, 'title'),
    note: typeof root.note === 'string' ? root.note.trim() : undefined,
    items: items.map((item, index) => normalizeDownloadItem(item, index)),
  };
}

export const DOWNLOAD_CATALOG = loadDownloadCatalog();
