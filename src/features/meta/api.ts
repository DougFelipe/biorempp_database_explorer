import { buildQuery, fetchJson } from '@/shared/api/client';
import type { PathwayOption } from '@/features/meta/types';

export async function getUniqueCompoundClasses(): Promise<string[]> {
  return fetchJson('/api/meta/compound-classes');
}

export async function getUniqueReferenceAGs(): Promise<string[]> {
  return fetchJson('/api/meta/reference-ags');
}

export async function getUniqueGenes(): Promise<string[]> {
  return fetchJson('/api/meta/genes');
}

export async function getUniquePathways(): Promise<string[]> {
  return fetchJson('/api/meta/pathways');
}

export async function getPathwayOptions(): Promise<PathwayOption[]> {
  return fetchJson('/api/meta/pathways/grouped');
}

export async function getToxicityEndpoints(): Promise<string[]> {
  return fetchJson('/api/meta/toxicity/endpoints');
}

export async function getToxicityLabels(endpoint?: string): Promise<string[]> {
  return fetchJson(`/api/meta/toxicity/labels${buildQuery({ endpoint })}`);
}
