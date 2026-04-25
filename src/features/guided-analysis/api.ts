import type {
  GuidedCatalogResponse,
  GuidedExecuteRequest,
  GuidedExecutionResponse,
  GuidedQueryOptionsResponse,
} from '@/features/guided-analysis/types';
import { apiUrl, buildQuery, fetchJson } from '@/shared/api/client';

export async function getGuidedCatalog(): Promise<GuidedCatalogResponse> {
  return fetchJson('/api/guided/catalog');
}

export async function getGuidedQueryOptions(
  queryId: string,
  selectedFilters: Record<string, unknown> = {}
): Promise<GuidedQueryOptionsResponse> {
  return fetchJson(`/api/guided/queries/${encodeURIComponent(queryId)}/options${buildQuery(selectedFilters)}`);
}

export async function executeGuidedQuery(
  queryId: string,
  payload: GuidedExecuteRequest = {}
): Promise<GuidedExecutionResponse> {
  const response = await fetch(apiUrl(`/api/guided/queries/${encodeURIComponent(queryId)}/execute`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<GuidedExecutionResponse>;
}
