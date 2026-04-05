import type { CompoundSummary, GeneSummary, IntegratedData, PathwaySummary } from '../types/database';
import type {
  AssetManifest,
  AssetMetadataResponse,
  IntegratedTableIndexRow,
  NetworkGraphData,
  SankeyData,
  ToxicityMatrixRow,
} from '../types/assets';

const ASSET_VERSION = 'v0.0.2';
const ASSET_BASE_PATH = `/assets/${ASSET_VERSION}`;

const assetCache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function fetchAsset<T>(fileName: string): Promise<T> {
  const cacheKey = `${ASSET_BASE_PATH}/${fileName}`;
  if (!assetCache.has(cacheKey)) {
    assetCache.set(cacheKey, fetchJson<T>(cacheKey));
  }
  return assetCache.get(cacheKey) as Promise<T>;
}

export function getAssetManifest(): Promise<AssetManifest> {
  return fetchAsset<AssetManifest>('manifest.json');
}

export function getAssetMetadata(): Promise<AssetMetadataResponse> {
  return fetchJson<AssetMetadataResponse>('/api/meta/assets');
}

export function getCompoundSummaryAsset(): Promise<CompoundSummary[]> {
  return fetchAsset<CompoundSummary[]>('compound_summary.json');
}

export function getGeneSummaryAsset(): Promise<GeneSummary[]> {
  return fetchAsset<GeneSummary[]>('gene_summary.json');
}

export function getPathwaySummaryAsset(): Promise<PathwaySummary[]> {
  return fetchAsset<PathwaySummary[]>('pathway_summary.json');
}

export function getToxicityMatrixAsset(): Promise<ToxicityMatrixRow[]> {
  return fetchAsset<ToxicityMatrixRow[]>('toxicity_matrix.json');
}

export function getNetworkGraphAsset(): Promise<NetworkGraphData> {
  return fetchAsset<NetworkGraphData>('network_graph.json');
}

export function getSankeyDataAsset(): Promise<SankeyData> {
  return fetchAsset<SankeyData>('sankey_data.json');
}

export function getIntegratedTableIndexAsset(): Promise<IntegratedTableIndexRow[]> {
  return fetchAsset<IntegratedTableIndexRow[]>('integrated_table.index.json');
}

export function getIntegratedTableShardAsset(cpd: string): Promise<IntegratedData[]> {
  return fetchAsset<IntegratedData[]>(`integrated_table.by_compound/${encodeURIComponent(cpd)}.json`);
}
