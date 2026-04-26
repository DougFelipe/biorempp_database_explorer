import { useEffect, useState } from 'react';
import { AppShell } from './app/AppShell';
import {
  buildCompoundClassPath,
  buildCompoundPath,
  buildGenePath,
  buildPathwayPath,
  getActiveView,
  getLegacyRedirectPath,
  getViewPath,
  parseRoute,
  resolveAppPath,
  type Route,
  type View,
} from './app/routes';
import { CompoundExplorer } from './components/CompoundExplorer';
import { CompoundClassExplorer } from './components/CompoundClassExplorer';
import { CompoundDetail } from './components/CompoundDetail';
import { CompoundClassDetail } from './components/CompoundClassDetail';
import { DatabaseMetricsPage } from './components/DatabaseMetricsPage';
import { FaqPage } from './components/FaqPage';
import { ContactPage } from './components/ContactPage';
import { GuidedAnalysisPage } from './components/GuidedAnalysisPage';
import { GeneExplorer } from './components/GeneExplorer';
import { GeneDetail } from './components/GeneDetail';
import { HomePage } from './components/HomePage';
import { PathwayExplorer } from './components/PathwayExplorer';
import { PathwayDetail } from './components/PathwayDetail';
import { ToxicityExplorer } from './components/ToxicityExplorer';
import { UserGuidePage } from './components/UserGuidePage';

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
    const legacyRedirectPath = getLegacyRedirectPath(window.location.pathname);
    if (legacyRedirectPath) {
      window.history.replaceState(null, '', legacyRedirectPath);
      setRoute({ kind: 'view', view: 'guided-analysis' });
    }
  }, []);

  function navigate(path: string, replace = false) {
    const target = resolveAppPath(path);
    const current = resolveAppPath(window.location.pathname);

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
    navigate(getViewPath(view));
  }

  function openCompoundDetail(cpd: string) {
    navigate(buildCompoundPath(cpd));
  }

  function openGeneDetail(ko: string) {
    navigate(buildGenePath(ko));
  }

  function openPathwayDetail(pathway: string, source?: string) {
    navigate(buildPathwayPath(pathway, source));
  }

  function openCompoundClassDetail(compoundclass: string) {
    navigate(buildCompoundClassPath(compoundclass));
  }

  function renderRouteContent() {
    if (route.kind === 'view' && route.view === 'home') {
      return <HomePage onNavigateToView={navigateToView} />;
    }
    if (route.kind === 'view' && route.view === 'user-guide') {
      return <UserGuidePage onNavigateToView={navigateToView} />;
    }
    if (route.kind === 'view' && route.view === 'faq') {
      return <FaqPage onNavigateToView={navigateToView} />;
    }
    if (route.kind === 'view' && route.view === 'contact') {
      return <ContactPage />;
    }
    if (route.kind === 'view' && route.view === 'database-metrics') {
      return <DatabaseMetricsPage onBack={() => navigateToView('home')} />;
    }
    if (route.kind === 'view' && route.view === 'compounds') {
      return <CompoundExplorer onCompoundSelect={openCompoundDetail} />;
    }
    if (route.kind === 'view' && route.view === 'compound-classes') {
      return <CompoundClassExplorer onCompoundClassSelect={openCompoundClassDetail} />;
    }
    if (route.kind === 'view' && route.view === 'genes') {
      return <GeneExplorer onGeneSelect={openGeneDetail} />;
    }
    if (route.kind === 'view' && route.view === 'pathways') {
      return <PathwayExplorer onPathwaySelect={openPathwayDetail} />;
    }
    if (route.kind === 'view' && route.view === 'toxicity') {
      return <ToxicityExplorer />;
    }
    if (route.kind === 'view' && route.view === 'guided-analysis') {
      return <GuidedAnalysisPage onCompoundSelect={openCompoundDetail} />;
    }
    if (route.kind === 'compound') {
      return <CompoundDetail cpd={route.cpd} onBack={() => navigateToView('compounds')} />;
    }
    if (route.kind === 'gene') {
      return (
        <GeneDetail
          ko={route.ko}
          onBack={() => navigateToView('genes')}
          onCompoundSelect={openCompoundDetail}
        />
      );
    }
    if (route.kind === 'compoundClass') {
      return (
        <CompoundClassDetail
          compoundclass={route.compoundclass}
          onBack={() => navigateToView('compound-classes')}
        />
      );
    }
    if (route.kind === 'pathway') {
      return <PathwayDetail pathway={route.pathway} source={route.source} onBack={() => navigateToView('pathways')} />;
    }

    return null;
  }

  return (
    <AppShell activeView={getActiveView(route)} onNavigateToView={navigateToView}>
      {renderRouteContent()}
    </AppShell>
  );
}

export default App;
