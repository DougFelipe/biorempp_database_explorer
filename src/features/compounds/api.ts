import { buildQuery, fetchJson } from '@/shared/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types';
import type {
  CompoundFilters,
  CompoundGeneCardRow,
  CompoundMetadata,
  CompoundOverviewResponse,
  CompoundPathwayCardRow,
  CompoundSummary,
  ToxicityEndpoint,
} from '@/features/compounds/types';

export async function getCompounds(
  filters: CompoundFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 50 }
): Promise<PaginatedResponse<CompoundSummary>> {
  return fetchJson(
    `/api/compounds${buildQuery({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function getCompoundById(cpd: string): Promise<CompoundSummary | null> {
  return fetchJson(`/api/compounds/${encodeURIComponent(cpd)}`);
}

export async function getCompoundMetadata(cpd: string): Promise<CompoundMetadata> {
  return fetchJson(`/api/compounds/${encodeURIComponent(cpd)}/metadata`);
}

export async function getCompoundOverview(
  cpd: string,
  options: { top_ko?: number; top_pathways?: number } = {}
): Promise<CompoundOverviewResponse> {
  return fetchJson(
    `/api/compounds/${encodeURIComponent(cpd)}/overview${buildQuery({
      top_ko: options.top_ko,
      top_pathways: options.top_pathways,
    })}`
  );
}

export async function getCompoundGenes(
  cpd: string,
  pagination: PaginationParams = { page: 1, pageSize: 100 }
): Promise<PaginatedResponse<CompoundGeneCardRow>> {
  return fetchJson(
    `/api/compounds/${encodeURIComponent(cpd)}/genes${buildQuery({
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function getCompoundPathways(
  cpd: string,
  pagination: PaginationParams = { page: 1, pageSize: 200 }
): Promise<PaginatedResponse<CompoundPathwayCardRow>> {
  return fetchJson(
    `/api/compounds/${encodeURIComponent(cpd)}/pathways${buildQuery({
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function getCompoundToxicityProfile(
  cpd: string,
  pagination: PaginationParams = { page: 1, pageSize: 100 }
): Promise<PaginatedResponse<ToxicityEndpoint>> {
  return fetchJson(
    `/api/compounds/${encodeURIComponent(cpd)}/toxicity-profile${buildQuery({
      page: pagination.page,
      pageSize: pagination.pageSize,
    })}`
  );
}

export async function exportCompoundsToCSV(filters: CompoundFilters = {}): Promise<string> {
  const response = await getCompounds(filters, { page: 1, pageSize: 10000 });
  const headers = [
    'CPD',
    'Compound Name',
    'Class',
    'Reference Count',
    'Reference AG',
    'KO Count',
    'Gene Count',
    'Pathway Annotations',
    'Toxicity Risk Mean',
    'High Risk Endpoints',
    'Toxicity Scores (Endpoint JSON)',
    'SMILES',
  ];

  const rows = response.data.map((compound) => [
    compound.cpd,
    compound.compoundname || '',
    compound.compoundclass || '',
    compound.reference_count,
    compound.reference_ag || '',
    compound.ko_count,
    compound.gene_count,
    compound.pathway_count,
    compound.toxicity_risk_mean ?? '',
    compound.high_risk_endpoint_count,
    JSON.stringify(compound.toxicity_scores || {}),
    compound.smiles || '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
}

export async function exportCompoundsToJSON(filters: CompoundFilters = {}): Promise<string> {
  const response = await getCompounds(filters, { page: 1, pageSize: 10000 });
  return JSON.stringify(response.data, null, 2);
}
