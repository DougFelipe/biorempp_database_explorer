import { buildQuery, fetchJson } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types';
import type {
  GeneAssociatedCompoundRow,
  GeneDetailOverviewResponse,
  GeneDetailSummary,
  GeneFilters,
  GeneMetadata,
  GeneSummary,
} from '@/features/genes/types';

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
