import { buildQuery, fetchJson } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types';
import type { PathwayDetailOverviewResponse, PathwayFilters, PathwaySummary } from '@/features/pathways/types';

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
