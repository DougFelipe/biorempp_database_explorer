import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  getCompoundById,
  getCompoundMetadata,
  getCompoundGenes,
  getCompoundToxicityProfile,
} from '../services/api';
import type {
  CompoundMetadata,
  CompoundSummary,
  CompoundGeneCardRow,
  ToxicityEndpoint,
} from '../types/database';
import { Pagination } from './Pagination';
import { CompoundMetadataPanel } from './CompoundMetadataPanel';
import { CompoundOverviewTab } from './CompoundOverviewTab';

interface CompoundDetailProps {
  cpd: string;
  onBack: () => void;
}

export function CompoundDetail({ cpd, onBack }: CompoundDetailProps) {
  const [summary, setSummary] = useState<CompoundSummary | null>(null);
  const [metadata, setMetadata] = useState<CompoundMetadata | null>(null);
  const [geneRows, setGeneRows] = useState<CompoundGeneCardRow[]>([]);
  const [toxicityRows, setToxicityRows] = useState<ToxicityEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [genesLoading, setGenesLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'genes' | 'metadata'>('overview');
  const [genePage, setGenePage] = useState(1);
  const [geneTotalPages, setGeneTotalPages] = useState(1);
  const [genePageSize] = useState(25);

  useEffect(() => {
    setGenePage(1);
    setActiveTab('overview');
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
      const [summaryData, toxicityData] = await Promise.all([
        getCompoundById(cpd),
        getCompoundToxicityProfile(cpd, { page: 1, pageSize: 200 }),
      ]);

      setSummary(summaryData);
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <p className="text-gray-600 text-center">Loading compound details...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-red-600">Compound not found</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg">
          Back to Compounds
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{summary.compoundname || summary.cpd}</h2>
            <p className="text-sm text-gray-500">{summary.cpd}</p>
          </div>
        </div>
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
            <p
              className="text-sm text-gray-500"
              title="Includes HADEG, KEGG and Compound Pathway annotations"
            >
              Pathway Annotations
            </p>
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
        {activeTab === 'overview' && <CompoundOverviewTab cpd={cpd} />}

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
  );
}
