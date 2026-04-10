import { useEffect, useState } from 'react';
import { BarChart3, Database, Dna, GitBranch, FlaskConical, Layers3, ShieldAlert } from 'lucide-react';
import { CompoundExplorer } from './components/CompoundExplorer';
import { CompoundClassExplorer } from './components/CompoundClassExplorer';
import { CompoundDetail } from './components/CompoundDetail';
import { CompoundClassDetail } from './components/CompoundClassDetail';
import { GuidedAnalysisPage } from './components/GuidedAnalysisPage';
import { GeneExplorer } from './components/GeneExplorer';
import { PathwayExplorer } from './components/PathwayExplorer';
import { PathwayDetail } from './components/PathwayDetail';
import { ToxicityExplorer } from './components/ToxicityExplorer';

type View = 'compounds' | 'compound-classes' | 'genes' | 'pathways' | 'toxicity' | 'guided-analysis';
type Route =
  | { kind: 'view'; view: View }
  | { kind: 'compound'; cpd: string }
  | { kind: 'compoundClass'; compoundclass: string }
  | { kind: 'pathway'; pathway: string; source?: string };

const VIEW_PATHS: Record<View, string> = {
  compounds: '/compounds',
  'compound-classes': '/compound-classes',
  genes: '/genes',
  pathways: '/pathways',
  toxicity: '/toxicity',
  'guided-analysis': '/guided-analysis',
};

function normalizePath(pathname: string) {
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned || '/';
}

function parseRoute(pathname: string): Route {
  const path = normalizePath(pathname);

  if (path === '/' || path === '/compounds') {
    return { kind: 'view', view: 'compounds' };
  }
  if (path === '/compound-classes') {
    return { kind: 'view', view: 'compound-classes' };
  }
  if (path === '/genes') {
    return { kind: 'view', view: 'genes' };
  }
  if (path === '/pathways') {
    return { kind: 'view', view: 'pathways' };
  }
  if (path === '/toxicity') {
    return { kind: 'view', view: 'toxicity' };
  }
  // Legacy alias: Visualizations has been deprecated in favor of Guided Analysis.
  if (path === '/visualizations') {
    return { kind: 'view', view: 'guided-analysis' };
  }
  if (path === '/guided-analysis') {
    return { kind: 'view', view: 'guided-analysis' };
  }
  if (path.startsWith('/pathways/detail/')) {
    const remainder = path.slice('/pathways/detail/'.length);
    if (remainder) {
      const segments = remainder.split('/').filter(Boolean);
      if (segments.length >= 2) {
        const source = decodeURIComponent(segments[0]).trim().toUpperCase();
        const pathway = decodeURIComponent(segments.slice(1).join('/')).trim();
        if (pathway) {
          return { kind: 'pathway', pathway, source: source || undefined };
        }
      } else {
        const pathway = decodeURIComponent(segments[0]).trim();
        if (pathway) {
          return { kind: 'pathway', pathway };
        }
      }
    }
  }
  if (path.startsWith('/compound-classes/detail/')) {
    const compoundclass = decodeURIComponent(path.slice('/compound-classes/detail/'.length)).trim();
    if (compoundclass) {
      return { kind: 'compoundClass', compoundclass };
    }
  }
  if (path.startsWith('/compounds/')) {
    const cpd = decodeURIComponent(path.slice('/compounds/'.length)).trim();
    if (cpd) {
      return { kind: 'compound', cpd: cpd.toUpperCase() };
    }
  }

  return { kind: 'view', view: 'compounds' };
}

function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    const path = normalizePath(window.location.pathname);
    if (path === '/visualizations') {
      window.history.replaceState(null, '', '/guided-analysis');
      setRoute({ kind: 'view', view: 'guided-analysis' });
    }
  }, []);

  function navigate(path: string, replace = false) {
    const target = normalizePath(path);
    const current = normalizePath(window.location.pathname);

    if (target !== current) {
      if (replace) {
        window.history.replaceState(null, '', target);
      } else {
        window.history.pushState(null, '', target);
      }
    }

    setRoute(parseRoute(target));
    window.scrollTo({ top: 0 });
  }

  function navigateToView(view: View) {
    navigate(VIEW_PATHS[view]);
  }

  function openCompoundDetail(cpd: string) {
    navigate(`/compounds/${encodeURIComponent(cpd)}`);
  }

  function openPathwayDetail(pathway: string, source?: string) {
    const encodedPathway = encodeURIComponent(pathway.trim());
    const normalizedSource = source?.trim().toUpperCase();
    if (normalizedSource && normalizedSource !== 'ALL') {
      navigate(`/pathways/detail/${encodeURIComponent(normalizedSource)}/${encodedPathway}`);
      return;
    }
    navigate(`/pathways/detail/${encodedPathway}`);
  }

  function openCompoundClassDetail(compoundclass: string) {
    navigate(`/compound-classes/detail/${encodeURIComponent(compoundclass.trim())}`);
  }

  const activeView: View =
    route.kind === 'compound'
      ? 'compounds'
      : route.kind === 'compoundClass'
      ? 'compound-classes'
      : route.kind === 'pathway'
      ? 'pathways'
      : route.view;

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
              onClick={() => navigateToView('compounds')}
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
              onClick={() => navigateToView('compound-classes')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'compound-classes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Layers3 className="w-4 h-4" />
              Compound Classes
            </button>
            <button
              onClick={() => navigateToView('genes')}
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
              onClick={() => navigateToView('pathways')}
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
              onClick={() => navigateToView('toxicity')}
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
              onClick={() => navigateToView('guided-analysis')}
              className={`flex items-center gap-2 px-3 py-4 border-b-2 font-medium text-sm transition-colors ${
                activeView === 'guided-analysis'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Guided Analysis
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {route.kind === 'view' && route.view === 'compounds' && (
          <CompoundExplorer onCompoundSelect={openCompoundDetail} />
        )}
        {route.kind === 'view' && route.view === 'compound-classes' && (
          <CompoundClassExplorer onCompoundClassSelect={openCompoundClassDetail} />
        )}
        {route.kind === 'view' && route.view === 'genes' && <GeneExplorer />}
        {route.kind === 'view' && route.view === 'pathways' && (
          <PathwayExplorer onPathwaySelect={openPathwayDetail} />
        )}
        {route.kind === 'view' && route.view === 'toxicity' && <ToxicityExplorer />}
        {route.kind === 'view' && route.view === 'guided-analysis' && (
          <GuidedAnalysisPage onCompoundSelect={openCompoundDetail} />
        )}
        {route.kind === 'compound' && (
          <CompoundDetail
            cpd={route.cpd}
            onBack={() => navigateToView('compounds')}
          />
        )}
        {route.kind === 'compoundClass' && (
          <CompoundClassDetail
            compoundclass={route.compoundclass}
            onBack={() => navigateToView('compound-classes')}
          />
        )}
        {route.kind === 'pathway' && (
          <PathwayDetail
            pathway={route.pathway}
            source={route.source}
            onBack={() => navigateToView('pathways')}
          />
        )}
      </main>

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
