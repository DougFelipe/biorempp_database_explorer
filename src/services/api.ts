import type {
  CompoundClassDetailOverviewResponse,
  CompoundClassSummary,
  GeneDetailSummary,
  GeneDetailOverviewResponse,
  GeneAssociatedCompoundRow,
  GeneMetadata,
  GeneSummary,
  PathwaySummary,
  PathwayDetailOverviewResponse,
  ToxicityEndpoint,
  CompoundClassFilters,
  GeneFilters,
  PathwayFilters,
  ToxicityFilters,
} from '@/types/database';
import type {
  GuidedCatalogResponse,
  GuidedExecuteRequest,
  GuidedExecutionResponse,
  GuidedQueryOptionsResponse,
} from '@/types/guided';
import { apiUrl, buildQuery, fetchJson } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types';
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
  getPathwayOptions,
  getToxicityEndpoints,
  getToxicityLabels,
  getUniqueCompoundClasses,
  getUniqueGenes,
  getUniquePathways,
  getUniqueReferenceAGs,
} from '@/features/meta/api';

export async function getGenes(
  filters: GeneFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
): Promise<PaginatedResponse<GeneSummary>> {
  return fetchJson(
    `/api/genes${buildQuery({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function getGeneByKo(ko: string): Promise<GeneDetailSummary | null> {
  return fetchJson(`/api/genes/${encodeURIComponent(ko)}`);
}

export async function getGeneDetailOverview(ko: string): Promise<GeneDetailOverviewResponse> {
  return fetchJson(`/api/genes/${encodeURIComponent(ko)}/overview`);
}

export async function getGeneAssociatedCompounds(
  ko: string,
  pagination: PaginationParams = { page: 1, pageSize: 25 }
): Promise<PaginatedResponse<GeneAssociatedCompoundRow>> {
  return fetchJson(
    `/api/genes/${encodeURIComponent(ko)}/compounds${buildQuery({
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function getGeneMetadata(ko: string): Promise<GeneMetadata> {
  return fetchJson(`/api/genes/${encodeURIComponent(ko)}/metadata`);
}

export async function getPathways(
  filters: PathwayFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
): Promise<PaginatedResponse<PathwaySummary>> {
  return fetchJson(
    `/api/pathways${buildQuery({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function getCompoundClasses(
  filters: CompoundClassFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
): Promise<PaginatedResponse<CompoundClassSummary>> {
  return fetchJson(
    `/api/compound-classes${buildQuery({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function getPathwayDetailOverview(
  pathway: string,
  options: { source?: string } = {}
): Promise<PathwayDetailOverviewResponse> {
  return fetchJson(
    `/api/pathways/detail/overview${buildQuery({
      pathway,
      source: options.source,
    })}`
  );
}

export async function getCompoundClassDetailOverview(
  compoundclass: string
): Promise<CompoundClassDetailOverviewResponse> {
  return fetchJson(
    `/api/compound-classes/detail/overview${buildQuery({
      compoundclass,
    })}`
  );
}

export async function getToxicityData(
  filters: ToxicityFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
): Promise<PaginatedResponse<ToxicityEndpoint>> {
  return fetchJson(
    `/api/toxicity${buildQuery({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

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

