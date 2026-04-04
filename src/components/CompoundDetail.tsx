import { useState, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { getCompoundById, getCompoundDetails } from '../services/api';
import type { CompoundSummary, IntegratedData } from '../types/database';

interface CompoundDetailProps {
  cpd: string;
  onClose: () => void;
}

export function CompoundDetail({ cpd, onClose }: CompoundDetailProps) {
  const [summary, setSummary] = useState<CompoundSummary | null>(null);
  const [details, setDetails] = useState<IntegratedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'genes' | 'pathways' | 'toxicity'>('genes');

  useEffect(() => {
    loadData();
  }, [cpd]);

  async function loadData() {
    setLoading(true);
    try {
      const [summaryData, detailsData] = await Promise.all([
        getCompoundById(cpd),
        getCompoundDetails(cpd),
      ]);
      setSummary(summaryData);
      setDetails(detailsData);
    } catch (error) {
      console.error('Error loading compound details:', error);
    } finally {
      setLoading(false);
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

  const uniqueGenes = Array.from(new Set(details.map(d => d.genesymbol).filter(Boolean)));
  const uniquePathwaysHADEG = Array.from(new Set(details.map(d => d.pathway_hadeg).filter(Boolean)));
  const uniquePathwaysKEGG = Array.from(new Set(details.map(d => d.pathway_kegg).filter(Boolean)));
  const toxicityData = details[0];

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
              <p className="text-sm text-gray-500">Toxicity Score</p>
              <p className="font-medium">{summary.toxicity_score.toFixed(2)}</p>
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
              Associated Genes ({uniqueGenes.length})
            </button>
            <button
              onClick={() => setActiveTab('pathways')}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'pathways'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Pathways ({uniquePathwaysHADEG.length + uniquePathwaysKEGG.length})
            </button>
            <button
              onClick={() => setActiveTab('toxicity')}
              className={`py-3 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'toxicity'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Toxicity Profile
            </button>
          </div>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'genes' && (
            <div className="space-y-4">
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
                  {details.map((detail, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm font-mono">{detail.ko || '-'}</td>
                      <td className="px-4 py-2 text-sm font-medium">{detail.genesymbol || '-'}</td>
                      <td className="px-4 py-2 text-sm">{detail.genename || '-'}</td>
                      <td className="px-4 py-2 text-sm">{detail.enzyme_activity || '-'}</td>
                      <td className="px-4 py-2 text-sm font-mono">{detail.ec || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'pathways' && (
            <div className="space-y-6">
              {uniquePathwaysHADEG.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">HADEG Pathways</h3>
                  <ul className="space-y-2">
                    {uniquePathwaysHADEG.map((pathway, idx) => (
                      <li key={idx} className="px-4 py-2 bg-blue-50 rounded-lg">
                        {pathway}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {uniquePathwaysKEGG.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">KEGG Pathways</h3>
                  <ul className="space-y-2">
                    {uniquePathwaysKEGG.map((pathway, idx) => (
                      <li key={idx} className="px-4 py-2 bg-green-50 rounded-lg">
                        {pathway}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {uniquePathwaysHADEG.length === 0 && uniquePathwaysKEGG.length === 0 && (
                <p className="text-gray-500 text-center py-4">No pathway data available</p>
              )}
            </div>
          )}

          {activeTab === 'toxicity' && (
            <div className="space-y-6">
              {toxicityData && Object.keys(toxicityData.toxicity_labels).length > 0 ? (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Toxicity Labels</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(toxicityData.toxicity_labels).map(([key, value]) => (
                        <div key={key} className="px-4 py-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{key.replace('label_', '')}</p>
                          <p className="font-medium">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Toxicity Values</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(toxicityData.toxicity_values).map(([key, value]) => (
                        <div key={key} className="px-4 py-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">{key.replace('value_', '')}</p>
                          <p className="font-medium">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">No toxicity data available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
