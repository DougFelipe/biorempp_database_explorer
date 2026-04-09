import type {
  CompoundOverviewResponse,
  CompoundSummary,
  CompoundMetadata,
  GeneSummary,
  PathwaySummary,
  ToxicityEndpoint,
  CompoundGeneCardRow,
  CompoundPathwayCardRow,
  PathwayOption,
  CompoundFilters,
  GeneFilters,
  PathwayFilters,
  ToxicityFilters,
  PaginationParams,
  PaginatedResponse,
} from '../types/database';

function buildQuery(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    searchParams.set(key, String(value));
  }
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

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

export async function exportCompoundsToCSV(filters: CompoundFilters = {}): Promise<string> {
  const response = await getCompounds(filters, { page: 1, pageSize: 10000 });
  const compounds = response.data;

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

  const rows = compounds.map((compound) => [
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

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
}

export async function exportCompoundsToJSON(filters: CompoundFilters = {}): Promise<string> {
  const response = await getCompounds(filters, { page: 1, pageSize: 10000 });
  return JSON.stringify(response.data, null, 2);
}
