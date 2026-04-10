import { useEffect, useMemo, useState } from 'react';
import { getCompounds } from '../services/api';
import type { CompoundSummary } from '../types/database';
import { ChartCard } from './charts/ChartCard';
import { HorizontalBarChart } from './charts/HorizontalBarChart';
import { GUIDED_QUERIES } from './guided-analysis/guidedQueries';
import { executeUc1, executeUc3 } from './guided-analysis/QueryExecutionEngine';
import { QuerySelectorPanel } from './guided-analysis/QuerySelectorPanel';
import { RiskPotentialScatterChart } from './guided-analysis/RiskPotentialScatterChart';
import { Pagination } from './Pagination';
import {
  getToxicityEndpointGroupKey,
  getToxicityEndpointGroupTitle,
  TOXICITY_ENDPOINT_GROUPS,
  type ToxicityEndpointGroupKey,
} from '../utils/toxicityEndpointGroups';
import { formatEndpoint } from '../utils/visualizationData';

interface GuidedAnalysisPageProps {
  onCompoundSelect: (cpd: string) => void;
}

const UC1_ID = 'uc1_top_bioremediation_compounds';
const UC3_ID = 'uc3_risk_vs_bioremediation_potential';

export function GuidedAnalysisPage({ onCompoundSelect }: GuidedAnalysisPageProps) {
  const [compounds, setCompounds] = useState<CompoundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQueryId, setSelectedQueryId] = useState<string>(GUIDED_QUERIES[0].id);
  const [uc1Page, setUc1Page] = useState(1);
  const [uc3Page, setUc3Page] = useState(1);
  const [uc3ClassFilter, setUc3ClassFilter] = useState('all');
  const [uc3GeneMin, setUc3GeneMin] = useState('');
  const [uc3GeneMax, setUc3GeneMax] = useState('');
  const [uc3ToxicityMin, setUc3ToxicityMin] = useState('');
  const [uc3ToxicityMax, setUc3ToxicityMax] = useState('');
  const [uc3PathwayMin, setUc3PathwayMin] = useState('');
  const [uc3PathwayMax, setUc3PathwayMax] = useState('');
  const [uc3EndpointGroupFilter, setUc3EndpointGroupFilter] = useState<'all' | ToxicityEndpointGroupKey>('all');
  const [uc3EndpointFilter, setUc3EndpointFilter] = useState<'mean' | string>('mean');

  const selectedQuery = useMemo(
    () => GUIDED_QUERIES.find((query) => query.id === selectedQueryId) ?? GUIDED_QUERIES[0],
    [selectedQueryId]
  );
  const isUc3 = selectedQuery.id === UC3_ID;

  const uc3EndpointOptions = useMemo(() => {
    const endpointSet = new Set<string>();
    for (const compound of compounds) {
      const scores = compound.toxicity_scores || {};
      for (const endpoint of Object.keys(scores)) {
        endpointSet.add(endpoint);
      }
    }

    const groupOrder = new Map<ToxicityEndpointGroupKey, number>();
    const endpointOrder = new Map<string, number>();
    TOXICITY_ENDPOINT_GROUPS.forEach((group, groupIdx) => {
      groupOrder.set(group.key, groupIdx);
      group.endpoints.forEach((endpoint, endpointIdx) => {
        endpointOrder.set(endpoint, endpointIdx);
      });
    });

    return [...endpointSet]
      .map((endpoint) => {
        const groupKey = getToxicityEndpointGroupKey(endpoint);
        return {
          endpoint,
          label: formatEndpoint(endpoint),
          groupKey,
          groupTitle: getToxicityEndpointGroupTitle(groupKey),
        };
      })
      .sort((a, b) => {
        const groupA = groupOrder.get(a.groupKey) ?? 999;
        const groupB = groupOrder.get(b.groupKey) ?? 999;
        if (groupA !== groupB) {
          return groupA - groupB;
        }
        const endpointA = endpointOrder.get(a.endpoint) ?? 999;
        const endpointB = endpointOrder.get(b.endpoint) ?? 999;
        if (endpointA !== endpointB) {
          return endpointA - endpointB;
        }
        return a.label.localeCompare(b.label);
      });
  }, [compounds]);

  const uc3VisibleEndpointOptions = useMemo(() => {
    if (uc3EndpointGroupFilter === 'all') {
      return uc3EndpointOptions;
    }
    return uc3EndpointOptions.filter((option) => option.groupKey === uc3EndpointGroupFilter);
  }, [uc3EndpointOptions, uc3EndpointGroupFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompounds() {
      setLoading(true);
      setError(null);
      try {
        const firstPage = await getCompounds({}, { page: 1, pageSize: 200 });
        let allRows = [...firstPage.data];

        if (firstPage.totalPages > 1) {
          const remaining = await Promise.all(
            Array.from({ length: firstPage.totalPages - 1 }, (_, idx) =>
              getCompounds({}, { page: idx + 2, pageSize: 200 })
            )
          );
          allRows = allRows.concat(remaining.flatMap((page) => page.data));
        }

        if (cancelled) {
          return;
        }
        setCompounds(allRows);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCompounds();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUc1Page(1);
    setUc3Page(1);
    setUc3ClassFilter('all');
    setUc3EndpointGroupFilter('all');
    setUc3EndpointFilter('mean');
    setUc3GeneMin('');
    setUc3GeneMax('');
    setUc3ToxicityMin('');
    setUc3ToxicityMax('');
    setUc3PathwayMin('');
    setUc3PathwayMax('');
  }, [selectedQueryId]);

  useEffect(() => {
    if (!isUc3) {
      return;
    }

    if (uc3EndpointGroupFilter !== 'all' && uc3EndpointFilter === 'mean') {
      const firstInGroup = uc3VisibleEndpointOptions[0];
      if (firstInGroup) {
        setUc3EndpointFilter(firstInGroup.endpoint);
      }
      return;
    }

    if (uc3EndpointFilter !== 'mean') {
      const exists = uc3VisibleEndpointOptions.some((option) => option.endpoint === uc3EndpointFilter);
      if (!exists) {
        setUc3EndpointFilter(uc3EndpointGroupFilter === 'all' ? 'mean' : uc3VisibleEndpointOptions[0]?.endpoint ?? 'mean');
      }
    }
  }, [isUc3, uc3EndpointGroupFilter, uc3EndpointFilter, uc3VisibleEndpointOptions]);

  const uc1Result = useMemo(
    () =>
      selectedQuery.id === UC1_ID
        ? executeUc1(selectedQuery, compounds, { page: uc1Page, pageSize: 10 })
        : null,
    [selectedQuery, compounds, uc1Page]
  );

  const uc3Result = useMemo(
    () =>
      selectedQuery.id === UC3_ID
        ? executeUc3(selectedQuery, compounds, {
            page: uc3Page,
            pageSize: 10,
            xThreshold: 200,
            yThreshold: 0.5,
            endpoint: uc3EndpointFilter === 'mean' ? null : uc3EndpointFilter,
          })
        : null,
    [selectedQuery, compounds, uc3Page, uc3EndpointFilter]
  );

  useEffect(() => {
    if (uc1Result && uc1Page > uc1Result.totalPages) {
      setUc1Page(uc1Result.totalPages);
    }
  }, [uc1Page, uc1Result]);

  useEffect(() => {
    if (uc3Result && uc3Page > uc3Result.totalPages) {
      setUc3Page(uc3Result.totalPages);
    }
  }, [uc3Page, uc3Result]);

  const uc3Ranges = useMemo(() => {
    if (!uc3Result || uc3Result.points.length === 0) {
      return null;
    }

    const geneCounts = uc3Result.points.map((point) => point.gene_count);
    const toxicityValues = uc3Result.points.map((point) => point.y_value);
    const pathwayCounts = uc3Result.points.map((point) => point.pathway_count);

    return {
      geneMin: Math.min(...geneCounts),
      geneMax: Math.max(...geneCounts),
      toxicityMin: Math.min(...toxicityValues),
      toxicityMax: Math.max(...toxicityValues),
      pathwayMin: Math.min(...pathwayCounts),
      pathwayMax: Math.max(...pathwayCounts),
      geneP95: [...geneCounts].sort((a, b) => a - b)[Math.floor(0.95 * (geneCounts.length - 1))] ?? Math.max(...geneCounts),
    };
  }, [uc3Result]);

  const uc3ClassOptions = useMemo(() => {
    if (!uc3Result) {
      return [];
    }

    return [...new Set(uc3Result.points.map((point) => point.compoundclass || 'Unclassified'))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [uc3Result]);

  const selectedEndpointOption = useMemo(
    () => uc3EndpointOptions.find((option) => option.endpoint === uc3EndpointFilter) || null,
    [uc3EndpointOptions, uc3EndpointFilter]
  );

  const uc3YAxisLabel = useMemo(() => {
    if (uc3EndpointFilter === 'mean') {
      return 'toxicity_risk_mean';
    }
    return selectedEndpointOption?.label || uc3EndpointFilter;
  }, [uc3EndpointFilter, selectedEndpointOption]);

  const uc3FilterValues = useMemo(
    () => ({
      geneMin: uc3GeneMin.trim() === '' ? undefined : Number(uc3GeneMin),
      geneMax: uc3GeneMax.trim() === '' ? undefined : Number(uc3GeneMax),
      toxMin: uc3ToxicityMin.trim() === '' ? undefined : Number(uc3ToxicityMin),
      toxMax: uc3ToxicityMax.trim() === '' ? undefined : Number(uc3ToxicityMax),
      pathwayMin: uc3PathwayMin.trim() === '' ? undefined : Number(uc3PathwayMin),
      pathwayMax: uc3PathwayMax.trim() === '' ? undefined : Number(uc3PathwayMax),
    }),
    [uc3GeneMin, uc3GeneMax, uc3ToxicityMin, uc3ToxicityMax, uc3PathwayMin, uc3PathwayMax]
  );

  const uc3FilteredPoints = useMemo(() => {
    if (!uc3Result) {
      return [];
    }

    return uc3Result.points.filter((point) => {
      const pointClass = point.compoundclass || 'Unclassified';

      if (uc3ClassFilter !== 'all' && pointClass !== uc3ClassFilter) {
        return false;
      }
      if (uc3FilterValues.geneMin !== undefined && !Number.isNaN(uc3FilterValues.geneMin) && point.gene_count < uc3FilterValues.geneMin) {
        return false;
      }
      if (uc3FilterValues.geneMax !== undefined && !Number.isNaN(uc3FilterValues.geneMax) && point.gene_count > uc3FilterValues.geneMax) {
        return false;
      }
      if (uc3FilterValues.toxMin !== undefined && !Number.isNaN(uc3FilterValues.toxMin) && point.y_value < uc3FilterValues.toxMin) {
        return false;
      }
      if (uc3FilterValues.toxMax !== undefined && !Number.isNaN(uc3FilterValues.toxMax) && point.y_value > uc3FilterValues.toxMax) {
        return false;
      }
      if (uc3FilterValues.pathwayMin !== undefined && !Number.isNaN(uc3FilterValues.pathwayMin) && point.pathway_count < uc3FilterValues.pathwayMin) {
        return false;
      }
      if (uc3FilterValues.pathwayMax !== undefined && !Number.isNaN(uc3FilterValues.pathwayMax) && point.pathway_count > uc3FilterValues.pathwayMax) {
        return false;
      }

      return true;
    });
  }, [uc3Result, uc3ClassFilter, uc3FilterValues]);

  const uc3FilteredQuadrantCounts = useMemo(
    () =>
      uc3FilteredPoints.reduce(
        (acc, point) => {
          acc[point.quadrant] += 1;
          return acc;
        },
        {
          top_right: 0,
          top_left: 0,
          bottom_right: 0,
          bottom_left: 0,
        }
      ),
    [uc3FilteredPoints]
  );

  const uc3TopRightFiltered = useMemo(
    () =>
      uc3FilteredPoints
        .filter((point) => point.quadrant === 'top_right')
        .sort((a, b) => {
          const riskDelta = b.y_value - a.y_value;
          if (riskDelta !== 0) {
            return riskDelta;
          }
          const potentialDelta = b.gene_count - a.gene_count;
          if (potentialDelta !== 0) {
            return potentialDelta;
          }
          return a.cpd.localeCompare(b.cpd);
        }),
    [uc3FilteredPoints]
  );

  const uc3FilteredTotalPages = useMemo(
    () => Math.max(1, Math.ceil(uc3TopRightFiltered.length / 10)),
    [uc3TopRightFiltered]
  );
  const uc3EffectivePage = Math.min(uc3Page, uc3FilteredTotalPages);
  const uc3StartRank = (uc3EffectivePage - 1) * 10;
  const uc3TopRightPageRows = useMemo(
    () => uc3TopRightFiltered.slice(uc3StartRank, uc3StartRank + 10),
    [uc3TopRightFiltered, uc3StartRank]
  );

  useEffect(() => {
    setUc3Page(1);
  }, [
    uc3ClassFilter,
    uc3EndpointGroupFilter,
    uc3EndpointFilter,
    uc3GeneMin,
    uc3GeneMax,
    uc3ToxicityMin,
    uc3ToxicityMax,
    uc3PathwayMin,
    uc3PathwayMax,
  ]);

  useEffect(() => {
    if (uc3Page > uc3FilteredTotalPages) {
      setUc3Page(uc3FilteredTotalPages);
    }
  }, [uc3Page, uc3FilteredTotalPages]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">Guided Analysis</h2>
        <p className="text-sm text-gray-600 mt-1">
          Predefined scientific queries for fast analytical exploration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <QuerySelectorPanel
          queries={GUIDED_QUERIES}
          selectedId={selectedQuery.id}
          onSelect={setSelectedQueryId}
        />

        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              Loading guided query dataset...
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 text-red-700">
              Unable to execute guided query: {error}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">{selectedQuery.title}</h3>
                <p className="text-sm text-gray-700">{selectedQuery.question}</p>
                <p className="text-sm text-gray-600">{selectedQuery.description}</p>
                {isUc3 && uc3Result ? (
                  <>
                    <p className="text-sm text-gray-500">
                      {uc3Result.compoundsInScope} compounds in scope ({selectedQuery.dataset}).
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
                      <div className="rounded border border-gray-200 px-3 py-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Plotted Points</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {uc3FilteredPoints.length}
                          <span className="text-sm text-gray-500 font-normal"> / {uc3Result.points.length}</span>
                        </p>
                      </div>
                      <div className="rounded border border-gray-200 px-3 py-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Excluded (Null {uc3YAxisLabel})
                        </p>
                        <p className="text-lg font-semibold text-gray-900">{uc3Result.excludedNullToxicityCount}</p>
                      </div>
                      <div className="rounded border border-gray-200 px-3 py-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Top-right Quadrant</p>
                        <p className="text-lg font-semibold text-gray-900">{uc3FilteredQuadrantCounts.top_right}</p>
                      </div>
                      <div className="rounded border border-gray-200 px-3 py-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Quadrant Sum Check</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {uc3FilteredQuadrantCounts.top_right +
                            uc3FilteredQuadrantCounts.top_left +
                            uc3FilteredQuadrantCounts.bottom_right +
                            uc3FilteredQuadrantCounts.bottom_left}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Scatter Filters</p>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="w-full min-[1400px]:w-auto min-[1400px]:flex-1 min-w-[180px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint Group</label>
                          <select
                            value={uc3EndpointGroupFilter}
                            onChange={(event) =>
                              setUc3EndpointGroupFilter(event.target.value as 'all' | ToxicityEndpointGroupKey)
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="all">All groups</option>
                            {TOXICITY_ENDPOINT_GROUPS.filter((group) => group.key !== 'other').map((group) => (
                              <option key={group.key} value={group.key}>
                                {group.title}
                              </option>
                            ))}
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div className="w-full min-[1400px]:w-auto min-[1400px]:flex-1 min-w-[210px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Y Axis Endpoint</label>
                          <select
                            value={uc3EndpointFilter}
                            onChange={(event) => setUc3EndpointFilter(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="mean">toxicity_risk_mean (all endpoints mean)</option>
                            {uc3VisibleEndpointOptions.map((option) => (
                              <option key={option.endpoint} value={option.endpoint}>
                                {option.label} ({option.groupTitle})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full min-[1400px]:w-auto min-[1400px]:flex-1 min-w-[180px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Compound Class</label>
                          <select
                            value={uc3ClassFilter}
                            onChange={(event) => setUc3ClassFilter(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          >
                            <option value="all">All classes</option>
                            {uc3ClassOptions.map((compoundClass) => (
                              <option key={compoundClass} value={compoundClass}>
                                {compoundClass}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="min-w-[130px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Gene Min {uc3Ranges ? `(${uc3Ranges.geneMin}-${uc3Ranges.geneMax})` : ''}
                          </label>
                          <input
                            type="number"
                            value={uc3GeneMin}
                            onChange={(event) => setUc3GeneMin(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder={uc3Ranges ? String(uc3Ranges.geneMin) : '0'}
                          />
                        </div>

                        <div className="min-w-[130px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Gene Max {uc3Ranges ? `(${uc3Ranges.geneMin}-${uc3Ranges.geneMax})` : ''}
                          </label>
                          <input
                            type="number"
                            value={uc3GeneMax}
                            onChange={(event) => setUc3GeneMax(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder={uc3Ranges ? String(uc3Ranges.geneMax) : ''}
                          />
                        </div>

                        <div className="min-w-[130px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {uc3YAxisLabel} Min
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={uc3ToxicityMin}
                            onChange={(event) => setUc3ToxicityMin(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder={uc3Ranges ? uc3Ranges.toxicityMin.toFixed(2) : '0.00'}
                          />
                        </div>

                        <div className="min-w-[130px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {uc3YAxisLabel} Max
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={uc3ToxicityMax}
                            onChange={(event) => setUc3ToxicityMax(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder={uc3Ranges ? uc3Ranges.toxicityMax.toFixed(2) : '1.00'}
                          />
                        </div>

                        <div className="min-w-[130px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Pathway Min {uc3Ranges ? `(${uc3Ranges.pathwayMin}-${uc3Ranges.pathwayMax})` : ''}
                          </label>
                          <input
                            type="number"
                            value={uc3PathwayMin}
                            onChange={(event) => setUc3PathwayMin(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder={uc3Ranges ? String(uc3Ranges.pathwayMin) : '0'}
                          />
                        </div>

                        <div className="min-w-[130px]">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Pathway Max {uc3Ranges ? `(${uc3Ranges.pathwayMin}-${uc3Ranges.pathwayMax})` : ''}
                          </label>
                          <input
                            type="number"
                            value={uc3PathwayMax}
                            onChange={(event) => setUc3PathwayMax(event.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            placeholder={uc3Ranges ? String(uc3Ranges.pathwayMax) : ''}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          {uc3Ranges && (
                            <button
                              type="button"
                              onClick={() => setUc3GeneMax(String(uc3Ranges.geneP95))}
                              className="px-3 py-2 text-xs font-medium rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                            >
                              Focus Cluster (Gene p95={uc3Ranges.geneP95})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setUc3ClassFilter('all');
                              setUc3EndpointGroupFilter('all');
                              setUc3EndpointFilter('mean');
                              setUc3GeneMin('');
                              setUc3GeneMax('');
                              setUc3ToxicityMin('');
                              setUc3ToxicityMax('');
                              setUc3PathwayMin('');
                              setUc3PathwayMax('');
                            }}
                            className="px-3 py-2 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700">
                      Insight: top-right compounds combine high degradation potential and high risk, supporting
                      strategic prioritization.
                    </p>
                  </>
                ) : uc1Result ? (
                  <>
                    <p className="text-sm text-gray-500">
                      {uc1Result.compoundsInScope} compounds in scope ({selectedQuery.dataset}).
                    </p>
                    <p className="text-sm text-blue-700">
                      Insight: compounds in the top ranking have broad KO coverage and higher functional diversity.
                    </p>
                  </>
                ) : null}
              </div>

              {isUc3 && uc3Result ? (
                <>
                  <ChartCard
                    title="Risk vs Bioremediation Potential"
                    subtitle={`x = gene_count, y = ${uc3YAxisLabel} | thresholds: x=${uc3Result.xThreshold}, y=${uc3Result.yThreshold} | showing ${uc3FilteredPoints.length}/${uc3Result.points.length}`}
                  >
                    <RiskPotentialScatterChart
                      points={uc3FilteredPoints}
                      xThreshold={uc3Result.xThreshold}
                      yThreshold={uc3Result.yThreshold}
                      yMetricLabel={uc3YAxisLabel}
                      onSelectCompound={onCompoundSelect}
                    />
                  </ChartCard>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <p className="text-sm text-gray-600">
                        Top-right quadrant compounds (High Risk + High Potential), page {uc3EffectivePage} of{' '}
                        {uc3FilteredTotalPages}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Compound ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Class
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gene Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {uc3YAxisLabel}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pathway Annotations
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {uc3TopRightPageRows.map((row, idx) => (
                            <tr
                              key={row.cpd}
                              onClick={() => onCompoundSelect(row.cpd)}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {uc3StartRank + idx + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {row.cpd}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.compoundname || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.compoundclass || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.gene_count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.y_value.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.pathway_count}
                              </td>
                            </tr>
                          ))}
                          {uc3TopRightPageRows.length === 0 && (
                            <tr>
                              <td className="px-6 py-6 text-sm text-gray-500" colSpan={7}>
                                No compounds in the top-right quadrant for the configured thresholds.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {uc3FilteredTotalPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-200">
                        <Pagination
                          currentPage={uc3EffectivePage}
                          totalPages={uc3FilteredTotalPages}
                          onPageChange={setUc3Page}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : uc1Result ? (
                <>
                  <ChartCard title="Top Bioremediation Compounds (KO Count)" subtitle="Top 10 by ko_count (desc)">
                    <HorizontalBarChart items={uc1Result.barItems} emptyMessage="No ranking data available." />
                  </ChartCard>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <p className="text-sm text-gray-600">
                        Ranked compounds by KO count (page {uc1Result.page} of {uc1Result.totalPages})
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rank
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Compound ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Class
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              KO Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gene Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pathway Annotations
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {uc1Result.rankingRowsPage.map((row, idx) => (
                            <tr
                              key={row.cpd}
                              onClick={() => onCompoundSelect(row.cpd)}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {uc1Result.startRank + idx + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {row.cpd}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {row.compoundname || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.compoundclass || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.ko_count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.gene_count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {row.pathway_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {uc1Result.totalPages > 1 && (
                      <div className="px-6 py-4 border-t border-gray-200">
                        <Pagination
                          currentPage={uc1Result.page}
                          totalPages={uc1Result.totalPages}
                          onPageChange={setUc1Page}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
