import { useState } from 'react';
import { BarChart3, Database, Dna, GitBranch, FlaskConical, ShieldAlert } from 'lucide-react';
import { CompoundExplorer } from './components/CompoundExplorer';
import { CompoundDetail } from './components/CompoundDetail';
import { GeneExplorer } from './components/GeneExplorer';
import { PathwayExplorer } from './components/PathwayExplorer';
import { ToxicityExplorer } from './components/ToxicityExplorer';
import { VisualizationsHub } from './components/VisualizationsHub';

type View = 'compounds' | 'genes' | 'pathways' | 'toxicity' | 'visualizations';

function App() {
  const [activeView, setActiveView] = useState<View>('compounds');
  const [selectedCompound, setSelectedCompound] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BioRemPP Database Explorer</h1>
              <p className="text-sm text-gray-600 mt-1">
                Integrated bioremediation and toxicological data exploration
              </p>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveView('compounds')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'compounds'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database className="w-4 h-4" />
              Compounds
            </button>
            <button
              onClick={() => setActiveView('genes')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'genes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Dna className="w-4 h-4" />
              Genes / KO
            </button>
            <button
              onClick={() => setActiveView('pathways')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'pathways'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Pathways
            </button>
            <button
              onClick={() => setActiveView('toxicity')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'toxicity'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Toxicity
            </button>
            <button
              onClick={() => setActiveView('visualizations')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'visualizations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Visualizations
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'compounds' && (
          <CompoundExplorer onCompoundSelect={setSelectedCompound} />
        )}
        {activeView === 'genes' && <GeneExplorer />}
        {activeView === 'pathways' && <PathwayExplorer />}
        {activeView === 'toxicity' && <ToxicityExplorer />}
        {activeView === 'visualizations' && <VisualizationsHub />}
      </main>

      {selectedCompound && (
        <CompoundDetail
          cpd={selectedCompound}
          onClose={() => setSelectedCompound(null)}
        />
      )}

      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            BioRemPP Database Explorer - Integrating BioRemPP, HADEG, KEGG, and ToxCSM data
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
