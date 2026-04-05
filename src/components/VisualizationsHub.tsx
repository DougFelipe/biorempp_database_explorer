import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Flame,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  getAssetManifest,
  getAssetMetadata,
  getCompoundSummaryAsset,
  getNetworkGraphAsset,
  getSankeyDataAsset,
  getToxicityMatrixAsset,
} from '../services/assets';
import type { CompoundFilters, CompoundSummary } from '../types/database';
import type {
  AssetManifest,
  NetworkGraphData,
  SankeyData,
  ToxicityMatrixRow,
  VisualizationChartId,
} from '../types/assets';
import { applyCompoundFilters, getCompoundFilterMetadata } from '../utils/compoundFilters';
import {
  getCompoundLabel,
  toFilteredNetworkGraph,
  toFilteredSankeyData,
} from '../utils/visualizationData';
import { CompoundRankingBarChart } from './visualizations/CompoundRankingBarChart';
import { CompoundPathwayHeatmap } from './visualizations/CompoundPathwayHeatmap';
import { NetworkGraphCanvas } from './visualizations/NetworkGraphCanvas';
import { SankeyFlowChart } from './visualizations/SankeyFlowChart';
import { ToxicityRadarChart } from './visualizations/ToxicityRadarChart';

type GraphScope = 'filtered' | 'full';

type ChartTab = {
  id: VisualizationChartId;
  label: string;
  description: string;
};

const chartTabs: ChartTab[] = [
  {
    id: 'compound_ranking_bar',
    label: 'CompoundRankingBarChart',
    description: 'Top compounds by gene_count.',
  },
  {
    id: 'compound_pathway_heatmap',
    label: 'CompoundPathwayHeatmap',
    description: 'Coverage of major pathways across compounds.',
  },
  {
    id: 'network_graph',
    label: 'NetworkGraph',
    description: 'Connectivity between KO, genes, compounds and pathways.',
  },
  {
    id: 'sankey_flow',
    label: 'SankeyFlow',
    description: 'Flow from KO to compounds and toxicity endpoints.',
  },
  {
    id: 'toxicity_radar',
    label: 'ToxicityRadar',
    description: 'Multi-endpoint toxicity profile for selected compound.',
  },
];

function AssetStatusBanner({
  loading,
  error,
  manifest,
}: {
  loading: boolean;
  error: string | null;
  manifest: AssetManifest | null;
}) {
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 text-blue-800">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading static visualization assets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
        <AlertCircle className="w-4 h-4" />
        Asset manifest not found. Run `npm run export:assets`.
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800">
      <p className="font-medium">Assets ready (`{manifest.version}`)</p>
      <p className="text-sm mt-1">
        {manifest.counts.compounds} compounds, {manifest.counts.toxicity_compounds} compounds with toxicity,
        {` `}{manifest.counts.toxicity_endpoints} endpoints.
      </p>
    </div>
  );
}

export function VisualizationsHub() {
  const [activeChart, setActiveChart] = useState<VisualizationChartId>('compound_ranking_bar');
  const [graphScope, setGraphScope] = useState<GraphScope>('filtered');
  const [topN, setTopN] = useState(20);

  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [compoundSummary, setCompoundSummary] = useState<CompoundSummary[]>([]);
  const [toxicityMatrix, setToxicityMatrix] = useState<ToxicityMatrixRow[]>([]);
  const [networkGraph, setNetworkGraph] = useState<NetworkGraphData | null>(null);
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);

  const [filters, setFilters] = useState<CompoundFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [selectedCompoundCpd, setSelectedCompoundCpd] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    setAssetsLoading(true);
    setAssetsError(null);

    try {
      const [assetMeta, fallbackManifest, compounds, toxicity, network, sankey] = await Promise.all([
        getAssetMetadata(),
        getAssetManifest(),
        getCompoundSummaryAsset(),
        getToxicityMatrixAsset(),
        getNetworkGraphAsset(),
        getSankeyDataAsset(),
      ]);

      const resolvedManifest = assetMeta.manifest ?? fallbackManifest;
      if (!assetMeta.available && !resolvedManifest) {
        throw new Error('Asset pack unavailable. Run npm run export:assets.');
      }

      setManifest(resolvedManifest || null);
      setCompoundSummary(compounds);
      setToxicityMatrix(toxicity);
      setNetworkGraph(network);
      setSankeyData(sankey);

      if (compounds.length > 0) {
        setSelectedCompoundCpd(compounds[0].cpd);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setAssetsError(`Unable to load visualization assets: ${message}`);
    } finally {
      setAssetsLoading(false);
    }
  }

  function handleFilterChange(key: keyof CompoundFilters, value: string | number | undefined) {
    setFilters((current) => {
      const next = { ...current };
      if (value === '' || value === undefined) {
        delete next[key];
      } else {
        next[key] = value as never;
      }
      return next;
    });
  }

  function handleSearch() {
    handleFilterChange('search', searchInput || undefined);
  }

  function clearFilters() {
    setFilters({});
    setSearchInput('');
    setGraphScope('filtered');
  }

  const filterMetadata = useMemo(() => getCompoundFilterMetadata(compoundSummary), [compoundSummary]);

  const filteredCompounds = useMemo(
    () => applyCompoundFilters(compoundSummary, filters),
    [compoundSummary, filters]
  );
  const compoundsWithToxicity = useMemo(
    () => filteredCompounds.filter((compound) => compound.toxicity_risk_mean !== null),
    [filteredCompounds]
  );

  const filteredCompoundSet = useMemo(
    () => new Set(filteredCompounds.map((compound) => compound.cpd)),
    [filteredCompounds]
  );

  const hasActiveFilters = Object.keys(filters).length > 0;
  const useFilteredSubgraph = hasActiveFilters && graphScope === 'filtered';

  useEffect(() => {
    if (filteredCompounds.length === 0) {
      setSelectedCompoundCpd(null);
      return;
    }

    if (!selectedCompoundCpd || !filteredCompoundSet.has(selectedCompoundCpd)) {
      setSelectedCompoundCpd(filteredCompounds[0].cpd);
    }
  }, [filteredCompoundSet, filteredCompounds, selectedCompoundCpd]);

  const networkView = useMemo(() => {
    if (!networkGraph) {
      return null;
    }
    return toFilteredNetworkGraph(networkGraph, filteredCompoundSet, useFilteredSubgraph);
  }, [filteredCompoundSet, networkGraph, useFilteredSubgraph]);

  const sankeyView = useMemo(() => {
    if (!sankeyData) {
      return null;
    }
    return toFilteredSankeyData(sankeyData, filteredCompoundSet, useFilteredSubgraph);
  }, [filteredCompoundSet, sankeyData, useFilteredSubgraph]);

  const selectedCompound = useMemo(
    () => filteredCompounds.find((compound) => compound.cpd === selectedCompoundCpd) ?? null,
    [filteredCompounds, selectedCompoundCpd]
  );

  return (
    <div className="space-y-6">
      <AssetStatusBanner loading={assetsLoading} error={assetsError} manifest={manifest} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_300px] gap-6">
        <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4 h-fit sticky top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={clearFilters}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              Reset
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">Search compound</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Name or CPD"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              </div>
              <button
                onClick={handleSearch}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Go
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Compound class</label>
            <select
              value={filters.compoundclass || ''}
              onChange={(event) => handleFilterChange('compoundclass', event.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              {filterMetadata.compoundClasses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference AG</label>
            <select
              value={filters.reference_ag || ''}
              onChange={(event) => handleFilterChange('reference_ag', event.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              {filterMetadata.referenceAGs.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pathway</label>
            <select
              value={filters.pathway || ''}
              onChange={(event) => handleFilterChange('pathway', event.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              {filterMetadata.pathways.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gene</label>
            <select
              value={filters.gene || ''}
              onChange={(event) => handleFilterChange('gene', event.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              {filterMetadata.genes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gene min</label>
              <input
                type="number"
                value={filters.gene_count_min ?? ''}
                onChange={(event) =>
                  handleFilterChange('gene_count_min', event.target.value ? Number(event.target.value) : undefined)
                }
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gene max</label>
              <input
                type="number"
                value={filters.gene_count_max ?? ''}
                onChange={(event) =>
                  handleFilterChange('gene_count_max', event.target.value ? Number(event.target.value) : undefined)
                }
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">KO min</label>
              <input
                type="number"
                value={filters.ko_count_min ?? ''}
                onChange={(event) =>
                  handleFilterChange('ko_count_min', event.target.value ? Number(event.target.value) : undefined)
                }
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">KO max</label>
              <input
                type="number"
                value={filters.ko_count_max ?? ''}
                onChange={(event) =>
                  handleFilterChange('ko_count_max', event.target.value ? Number(event.target.value) : undefined)
                }
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Top N (bar chart)</label>
            <input
              type="range"
              min={10}
              max={100}
              value={topN}
              onChange={(event) => setTopN(Number(event.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Top {topN}</p>
          </div>

          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">Graph scope</p>
            <div className="flex gap-2">
              <button
                onClick={() => setGraphScope('filtered')}
                className={`px-2 py-1 text-xs rounded ${
                  graphScope === 'filtered' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Filtered
              </button>
              <button
                onClick={() => setGraphScope('full')}
                className={`px-2 py-1 text-xs rounded ${
                  graphScope === 'full' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Full
              </button>
            </div>
            {hasActiveFilters && graphScope === 'full' && (
              <p className="text-xs text-amber-600">Full graph enabled while filters are active.</p>
            )}
          </div>

          <div className="text-xs text-gray-500 border-t pt-3">
            <p>Filtered compounds: {filteredCompounds.length}</p>
            <p>Total compounds: {compoundSummary.length}</p>
          </div>
        </aside>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 text-gray-700">
              <BarChart3 className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Visualizations</h2>
            </div>
            <button
              onClick={loadAssets}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw className="w-4 h-4" />
              Reload assets
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {chartTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm border ${
                  tab.id === activeChart
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            {chartTabs.find((tab) => tab.id === activeChart)?.description}
          </p>

          {assetsLoading ? (
            <div className="py-16 text-center text-gray-500">Loading assets...</div>
          ) : assetsError ? (
            <div className="py-16 text-center text-red-600">{assetsError}</div>
          ) : filteredCompounds.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No compounds match the current filters.</div>
          ) : (
            <>
              {activeChart === 'compound_ranking_bar' && (
                <CompoundRankingBarChart
                  compounds={compoundsWithToxicity}
                  topN={topN}
                  onSelectCompound={setSelectedCompoundCpd}
                />
              )}

              {activeChart === 'compound_pathway_heatmap' && (
                <CompoundPathwayHeatmap
                  compounds={filteredCompounds}
                  onSelectCompound={setSelectedCompoundCpd}
                />
              )}

              {activeChart === 'network_graph' && networkView && (
                <NetworkGraphCanvas
                  graph={networkView}
                  highlightedCompounds={filteredCompoundSet}
                  onSelectCompound={setSelectedCompoundCpd}
                />
              )}

              {activeChart === 'sankey_flow' && sankeyView && (
                <SankeyFlowChart sankeyData={sankeyView} onSelectCompound={setSelectedCompoundCpd} />
              )}

              {activeChart === 'toxicity_radar' && (
                <ToxicityRadarChart
                  toxicityRows={toxicityMatrix}
                  compounds={filteredCompounds}
                  selectedCompoundCpd={selectedCompoundCpd}
                  onSelectCompound={setSelectedCompoundCpd}
                />
              )}
            </>
          )}
        </section>

        <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-gray-800">
            <Flame className="w-4 h-4" />
            <h3 className="font-semibold">Detail Panel</h3>
          </div>

          {selectedCompound ? (
            <>
              <div>
                <p className="text-xs text-gray-500">Selected compound</p>
                <p className="text-sm font-semibold text-gray-900">{selectedCompound.cpd}</p>
                <p className="text-sm text-gray-700">{getCompoundLabel(selectedCompound)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-500">Gene count</p>
                  <p className="font-semibold text-gray-800">{selectedCompound.gene_count}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-500">KO count</p>
                  <p className="font-semibold text-gray-800">{selectedCompound.ko_count}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-500">Pathways</p>
                  <p className="font-semibold text-gray-800">{selectedCompound.pathway_count}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-500">Toxicity risk mean</p>
                  <p className="font-semibold text-gray-800">
                    {selectedCompound.toxicity_risk_mean == null
                      ? '-'
                      : selectedCompound.toxicity_risk_mean.toFixed(3)}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Select a compound from any chart to inspect details.</p>
          )}

          <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
            <p>Chart: {chartTabs.find((tab) => tab.id === activeChart)?.label}</p>
            <p>Scope: {useFilteredSubgraph ? 'Filtered subgraph' : 'Full graph'}</p>
            <p>Filters active: {hasActiveFilters ? 'Yes' : 'No'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
