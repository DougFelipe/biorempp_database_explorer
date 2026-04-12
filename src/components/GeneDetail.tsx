import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  getGeneByKo,
  getGeneAssociatedCompounds,
  getGeneMetadata,
} from '../services/api';
import type {
  GeneDetailSummary,
  GeneAssociatedCompoundRow,
  GeneMetadata,
} from '../types/database';
import { Pagination } from './Pagination';
import { GeneMetadataPanel } from './GeneMetadataPanel';

interface GeneDetailProps {
  ko: string;
  onBack: () => void;
  onCompoundSelect: (cpd: string) => void;
}

type GeneTab = 'overview' | 'compounds' | 'metadata';

export function GeneDetail({ ko, onBack, onCompoundSelect }: GeneDetailProps) {
  const [summary, setSummary] = useState<GeneDetailSummary | null>(null);
  const [compounds, setCompounds] = useState<GeneAssociatedCompoundRow[]>([]);
  const [metadata, setMetadata] = useState<GeneMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compoundsLoading, setCompoundsLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<GeneTab>('overview');
  const [compoundPage, setCompoundPage] = useState(1);
  const [compoundTotalPages, setCompoundTotalPages] = useState(1);
  const [compoundPageSize] = useState(25);

  useEffect(() => {
    setActiveTab('overview');
    setCompoundPage(1);
    setMetadata(null);
  }, [ko]);

  useEffect(() => {
    loadSummary();
  }, [ko]);

  useEffect(() => {
    loadCompoundsPage();
  }, [ko, compoundPage]);

  useEffect(() => {
    if (activeTab !== 'metadata' || metadata) {
      return;
    }
    loadMetadata();
  }, [activeTab, ko, metadata]);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const response = await getGeneByKo(ko);
      setSummary(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompoundsPage() {
    setCompoundsLoading(true);
    try {
      const response = await getGeneAssociatedCompounds(ko, { page: compoundPage, pageSize: compoundPageSize });
      setCompounds(response.data);
      setCompoundTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error loading associated compounds:', err);
      setCompounds([]);
      setCompoundTotalPages(1);
    } finally {
      setCompoundsLoading(false);
    }
  }

  async function loadMetadata() {
    setMetadataLoading(true);
    try {
      const response = await getGeneMetadata(ko);
      setMetadata(response);
    } catch (err) {
      console.error('Error loading gene metadata:', err);
      setMetadata(null);
    } finally {
      setMetadataLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <p className="text-gray-600 text-center">Loading gene details...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-red-600">Gene not found.</p>
        {error ? <p className="text-sm text-gray-600 mt-2">{error}</p> : null}
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
          Back to Genes
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{summary.genesymbol || summary.ko}</h2>
            <p className="text-sm text-gray-500">{summary.ko}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Gene Symbol</p>
            <p className="font-medium">{summary.genesymbol || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Gene Name</p>
            <p className="font-medium">{summary.genename || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Linked Compounds</p>
            <p className="font-medium">{summary.compound_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pathway Annotations</p>
            <p className="font-medium">{summary.pathway_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Compound Classes</p>
            <p className="font-medium">{summary.compound_class_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Reference Agencies</p>
            <p className="font-medium">{summary.reference_agency_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Toxicity Coverage</p>
            <p className="font-medium">
              {summary.toxicity_coverage_pct == null ? '-' : `${summary.toxicity_coverage_pct}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-4 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('compounds')}
            className={`py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'compounds'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Associated Compounds ({summary.compound_count})
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'metadata'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Metadata
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">Overview</h3>
            <p className="mt-2 text-sm text-gray-600">
              Overview content for gene detail will be modeled in the next phase.
            </p>
          </div>
        )}

        {activeTab === 'compounds' && (
          <div className="space-y-4">
            {compoundsLoading ? (
              <p className="text-gray-500 text-center py-4">Loading associated compounds...</p>
            ) : compounds.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No compounds associated with this gene.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Compound ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">KO Count</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gene Count</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pathway Annotations</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Toxicity Risk Mean</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">High Risk Endpoints</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">References</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {compounds.map((compound) => (
                        <tr
                          key={compound.cpd}
                          onClick={() => onCompoundSelect(compound.cpd)}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-2 text-sm font-medium text-blue-600">{compound.cpd}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{compound.compoundname || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{compound.compoundclass || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{compound.ko_count}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{compound.gene_count}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{compound.pathway_count}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {compound.toxicity_risk_mean == null ? '-' : compound.toxicity_risk_mean.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">{compound.high_risk_endpoint_count}</td>
                          <td className="px-4 py-2 text-sm text-gray-500" title={compound.reference_ag || 'No reference annotation'}>
                            {compound.reference_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {compoundTotalPages > 1 && (
                  <Pagination
                    currentPage={compoundPage}
                    totalPages={compoundTotalPages}
                    onPageChange={setCompoundPage}
                  />
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-6">
            {metadataLoading ? (
              <p className="text-gray-500 text-center py-4">Loading metadata...</p>
            ) : metadata ? (
              <GeneMetadataPanel metadata={metadata} />
            ) : (
              <p className="text-gray-500 text-center py-4">Metadata unavailable for this gene.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
