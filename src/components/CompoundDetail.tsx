import { useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import {
  getCompoundById,
  getCompoundMetadata,
  getCompoundGenes,
  getCompoundPathways,
  getCompoundToxicityProfile,
} from '../services/api';
import type {
  CompoundMetadata,
  CompoundSummary,
  CompoundGeneCardRow,
  CompoundPathwayCardRow,
  ToxicityEndpoint,
} from '../types/database';
import { Pagination } from './Pagination';
import { CompoundMetadataPanel } from './CompoundMetadataPanel';

interface CompoundDetailProps {
  cpd: string;
  onClose: () => void;
}

export function CompoundDetail({ cpd, onClose }: CompoundDetailProps) {
  const [summary, setSummary] = useState<CompoundSummary | null>(null);
  const [metadata, setMetadata] = useState<CompoundMetadata | null>(null);
  const [geneRows, setGeneRows] = useState<CompoundGeneCardRow[]>([]);
  const [pathwayRows, setPathwayRows] = useState<CompoundPathwayCardRow[]>([]);
  const [toxicityRows, setToxicityRows] = useState<ToxicityEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [genesLoading, setGenesLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'genes' | 'pathways' | 'toxicity' | 'metadata'>('genes');
  const [genePage, setGenePage] = useState(1);
  const [geneTotalPages, setGeneTotalPages] = useState(1);
  const [genePageSize] = useState(25);

  useEffect(() => {
    setGenePage(1);
    setActiveTab('genes');
    setMetadata(null);
  }, [cpd]);

  useEffect(() => {
    loadCompoundContext();
  }, [cpd]);

  useEffect(() => {
    loadGenesPage();
  }, [cpd, genePage]);

  useEffect(() => {
    if (activeTab !== 'metadata' || metadata) {
      return;
    }
    loadMetadata();
  }, [activeTab, cpd, metadata]);

  async function loadCompoundContext() {
    setLoading(true);
    try {
      const [summaryData, pathwaysData, toxicityData] = await Promise.all([
        getCompoundById(cpd),
        getCompoundPathways(cpd, { page: 1, pageSize: 1000 }),
        getCompoundToxicityProfile(cpd, { page: 1, pageSize: 200 }),
      ]);

      setSummary(summaryData);
      setPathwayRows(pathwaysData.data);
      setToxicityRows(toxicityData.data);
    } catch (error) {
      console.error('Error loading compound details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadGenesPage() {
    setGenesLoading(true);
    try {
      const genesData = await getCompoundGenes(cpd, { page: genePage, pageSize: genePageSize });
      setGeneRows(genesData.data);
      setGeneTotalPages(genesData.totalPages);
    } catch (error) {
      console.error('Error loading compound genes:', error);
    } finally {
      setGenesLoading(false);
    }
  }

  async function loadMetadata() {
    setMetadataLoading(true);
    try {
      const data = await getCompoundMetadata(cpd);
      setMetadata(data);
    } catch (error) {
      console.error('Error loading compound metadata:', error);
    } finally {
      setMetadataLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <p className="text-gray-600">Loading compound details...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <p className="text-red-600">Compound not found</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  const pathwaysBySource = pathwayRows.reduce(
    (acc, row) => {
      acc[row.source] = acc[row.source] || [];
      acc[row.source].push(row);
      return acc;
    },
    {} as Record<string, CompoundPathwayCardRow[]>
  );

  const hadegPathways = pathwaysBySource.HADEG || [];
  const keggPathways = pathwaysBySource.KEGG || [];
  const compoundPathways = pathwaysBySource.COMPOUND_PATHWAY || [];
  const totalPathways = pathwayRows.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{summary.compoundname || summary.cpd}</h2>
              <p className="text-sm text-gray-500">{summary.cpd}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Class</p>
              <p className="font-medium">{summary.compoundclass || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reference</p>
              <p className="font-medium">{summary.reference_ag || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">KO Count</p>
              <p className="font-medium">{summary.ko_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gene Count</p>
              <p className="font-medium">{summary.gene_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pathway Count</p>
              <p className="font-medium">{summary.pathway_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Toxicity Risk Mean</p>
              <p className="font-medium">
                {summary.toxicity_risk_mean == null ? '-' : summary.toxicity_risk_mean.toFixed(2)}
              </p>
            </div>
            {summary.smiles && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500">SMILES</p>
                <p className="font-mono text-sm break-all">{summary.smiles}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('genes')}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'genes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Associated Genes ({summary.gene_count})
            </button>
            <button
              onClick={() => setActiveTab('pathways')}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'pathways'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pathways ({totalPathways})
            </button>
            <button
              onClick={() => setActiveTab('toxicity')}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'toxicity'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Toxicity Profile ({toxicityRows.length})
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

        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'genes' && (
            <div className="space-y-4">
              {genesLoading ? (
                <p className="text-gray-500 text-center py-4">Loading gene data...</p>
              ) : geneRows.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No gene data available</p>
              ) : (
                <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">KO</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gene Symbol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gene Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Enzyme Activity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {geneRows.map((detail, idx) => (
                    <tr key={`${detail.ko}-${detail.genesymbol}-${idx}`}>
                      <td className="px-4 py-2 text-sm font-mono">{detail.ko || '-'}</td>
                      <td className="px-4 py-2 text-sm font-medium">{detail.genesymbol || '-'}</td>
                      <td className="px-4 py-2 text-sm">{detail.genename || '-'}</td>
                      <td className="px-4 py-2 text-sm">{detail.enzyme_activity || '-'}</td>
                      <td className="px-4 py-2 text-sm font-mono">{detail.ec || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {geneTotalPages > 1 && (
                <Pagination
                  currentPage={genePage}
                  totalPages={geneTotalPages}
                  onPageChange={setGenePage}
                />
              )}
              </>
              )}
            </div>
          )}

          {activeTab === 'pathways' && (
            <div className="space-y-6">
              {hadegPathways.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">HADEG Pathways</h3>
                  <ul className="space-y-2">
                    {hadegPathways.map((pathway, idx) => (
                      <li key={`${pathway.pathway}-${idx}`} className="px-4 py-2 bg-blue-50 rounded-lg">
                        {pathway.pathway}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {keggPathways.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">KEGG Pathways</h3>
                  <ul className="space-y-2">
                    {keggPathways.map((pathway, idx) => (
                      <li key={`${pathway.pathway}-${idx}`} className="px-4 py-2 bg-green-50 rounded-lg">
                        {pathway.pathway}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {compoundPathways.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Compound Pathways</h3>
                  <ul className="space-y-2">
                    {compoundPathways.map((pathway, idx) => (
                      <li key={`${pathway.pathway}-${idx}`} className="px-4 py-2 bg-gray-100 rounded-lg">
                        {pathway.pathway}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {totalPathways === 0 && (
                <p className="text-gray-500 text-center py-4">No pathway data available</p>
              )}
            </div>
          )}

          {activeTab === 'toxicity' && (
            <div className="space-y-6">
              {toxicityRows.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {toxicityRows.map((row) => (
                      <tr key={row.endpoint}>
                        <td className="px-4 py-2 text-sm">{row.endpoint}</td>
                        <td className="px-4 py-2 text-sm">{row.label || '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          {row.value === null ? '-' : row.value.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 text-center py-4">No toxicity data available</p>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-6">
              {metadataLoading ? (
                <p className="text-gray-500 text-center py-4">Loading metadata...</p>
              ) : metadata ? (
                <CompoundMetadataPanel metadata={metadata} summary={summary} toxicityRows={toxicityRows} />
              ) : (
                <p className="text-gray-500 text-center py-4">Metadata unavailable for this compound.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
