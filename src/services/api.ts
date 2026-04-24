import type {
  GuidedCatalogResponse,
  GuidedExecuteRequest,
  GuidedExecutionResponse,
  GuidedQueryOptionsResponse,
} from '@/types/guided';
import { apiUrl, buildQuery, fetchJson } from '@/shared/api/client';
export {
  exportCompoundsToCSV,
  exportCompoundsToJSON,
  getCompoundById,
  getCompoundGenes,
  getCompoundMetadata,
  getCompoundOverview,
  getCompoundPathways,
  getCompounds,
  getCompoundToxicityProfile,
} from '@/features/compounds/api';
export {
  getGeneAssociatedCompounds,
  getGeneByKo,
  getGeneDetailOverview,
  getGeneMetadata,
  getGenes,
} from '@/features/genes/api';
export {
  getPathwayDetailOverview,
  getPathways,
} from '@/features/pathways/api';
export {
  getCompoundClassDetailOverview,
  getCompoundClasses,
} from '@/features/compound-classes/api';
export {
  getPathwayOptions,
  getUniqueCompoundClasses,
  getUniqueGenes,
  getUniquePathways,
  getUniqueReferenceAGs,
} from '@/features/meta/api';
export {
  getToxicityData,
  getToxicityEndpoints,
  getToxicityLabels,
} from '@/features/toxicity/api';

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

