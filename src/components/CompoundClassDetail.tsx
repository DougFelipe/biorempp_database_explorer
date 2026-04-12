import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getCompoundClassDetailOverview } from '../services/api';
import type { CompoundClassDetailOverviewResponse } from '../types/database';
import { ChartCard } from './charts/ChartCard';
import { HorizontalBarChart } from './charts/HorizontalBarChart';
import { DonutChart } from './charts/DonutChart';
import {
  toPathwayEcDonutSlices,
  toPathwayGeneBarItems,
  toPathwayKoBarItems,
} from '../utils/pathwayOverviewAdapters';
import { PathwayToxicityHeatmap } from './pathway-overview/PathwayToxicityHeatmap';

interface CompoundClassDetailProps {
  compoundclass: string;
  onBack: () => void;
}

interface SummaryMetric {
  label: string;
  value: string;
  hint?: string;
}

export function CompoundClassDetail({ compoundclass, onBack }: CompoundClassDetailProps) {
  const [overview, setOverview] = useState<CompoundClassDetailOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCompoundClassDetailOverview(compoundclass);
        if (cancelled) {
          return;
        }
        setOverview(data);
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

    loadOverview();
    return () => {
      cancelled = true;
    };
  }, [compoundclass]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <p className="text-gray-600 text-center">Loading compound class overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-red-600">Unable to load compound class overview.</p>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
          Back to Compound Classes
        </button>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-600">Compound class not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
          Back to Compound Classes
        </button>
      </div>
    );
  }

  const summaryMetrics: SummaryMetric[] = [
    {
      label: 'KOs',
      value: String(overview.summary.ko_count),
      hint: 'distinct KOs',
    },
    {
      label: 'Genes',
      value: String(overview.summary.gene_count),
      hint: 'associated genes',
    },
    {
      label: 'Compounds',
      value: String(overview.summary.compound_count),
      hint: 'linked compounds',
    },
    {
      label: 'Reactions',
      value: String(overview.summary.reaction_ec_count),
      hint: 'EC annotations',
    },
    {
      label: 'Sources',
      value: String(overview.summary.source_count),
      hint: 'KEGG / HADEG / Class',
    },
    {
      label: 'Toxicity Coverage',
      value: overview.summary.toxicity_coverage_pct == null ? '-' : `${overview.summary.toxicity_coverage_pct}%`,
      hint: 'compounds with ToxCSM',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{overview.compoundclass}</h2>
            <p className="text-sm text-gray-500">BioRemPP compound class overview</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {summaryMetrics.map((metric) => (
            <div key={metric.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
              {metric.hint ? <p className="text-xs text-gray-500 mt-1">{metric.hint}</p> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <ChartCard title="KO Distribution" subtitle="Top KOs by linked compounds">
            <HorizontalBarChart
              items={toPathwayKoBarItems(overview.ko_distribution)}
              emptyMessage="No KO distribution available."
            />
          </ChartCard>

          <ChartCard title="Gene Distribution" subtitle="Top genes by linked compounds">
            <HorizontalBarChart
              items={toPathwayGeneBarItems(overview.gene_distribution)}
              emptyMessage="No gene distribution available."
            />
          </ChartCard>

          <ChartCard title="EC Number Overview" subtitle="Enzyme Commission classes">
            <DonutChart
              slices={toPathwayEcDonutSlices(overview.ec_class_distribution)}
              emptyMessage="No EC class distribution available."
              centerLabel="EC"
            />
          </ChartCard>
        </div>

        <PathwayToxicityHeatmap matrix={overview.toxicity_matrix} />
      </div>
    </div>
  );
}
