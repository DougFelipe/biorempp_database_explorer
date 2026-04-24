import { buildQuery, fetchJson } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types';
import type { ToxicityEndpoint, ToxicityFilters } from '@/features/toxicity/types';

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

export async function getToxicityEndpoints(): Promise<string[]> {
  return fetchJson('/api/meta/toxicity/endpoints');
}

export async function getToxicityLabels(endpoint?: string): Promise<string[]> {
  return fetchJson(`/api/meta/toxicity/labels${buildQuery({ endpoint })}`);
}
