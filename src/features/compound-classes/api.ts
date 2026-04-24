import { buildQuery, fetchJson } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types';
import type {
  CompoundClassDetailOverviewResponse,
  CompoundClassFilters,
  CompoundClassSummary,
} from '@/features/compound-classes/types';

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

export async function getCompoundClassDetailOverview(
  compoundclass: string
): Promise<CompoundClassDetailOverviewResponse> {
  return fetchJson(
    `/api/compound-classes/detail/overview${buildQuery({
      compoundclass,
    })}`
  );
}
