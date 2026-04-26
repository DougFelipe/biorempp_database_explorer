import { getClientBasePath, stripBasePath, withBasePath } from '../utils/basePath';

export type View =
  | 'home'
  | 'user-guide'
  | 'faq'
  | 'contact'
  | 'database-metrics'
  | 'compounds'
  | 'compound-classes'
  | 'genes'
  | 'pathways'
  | 'toxicity'
  | 'guided-analysis';

export type Route =
  | { kind: 'view'; view: View }
  | { kind: 'compound'; cpd: string }
  | { kind: 'gene'; ko: string }
  | { kind: 'compoundClass'; compoundclass: string }
  | { kind: 'pathway'; pathway: string; source?: string };

export const VIEW_PATHS: Record<View, string> = {
  home: '/',
  'user-guide': '/user-guide',
  faq: '/faq',
  contact: '/contact',
  'database-metrics': '/database-metrics',
  compounds: '/compounds',
  'compound-classes': '/compound-classes',
  genes: '/genes',
  pathways: '/pathways',
  toxicity: '/toxicity',
  'guided-analysis': '/guided-analysis',
};

export const CLIENT_BASE_PATH = getClientBasePath();

export function normalizePath(pathname: string) {
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned || '/';
}

export function parseRoute(pathname: string): Route {
  const path = normalizePath(stripBasePath(pathname, CLIENT_BASE_PATH));

  if (path === '/' || path === '/home') {
    return { kind: 'view', view: 'home' };
  }
  if (path === '/compounds') {
    return { kind: 'view', view: 'compounds' };
  }
  if (path === '/user-guide') {
    return { kind: 'view', view: 'user-guide' };
  }
  if (path === '/faq') {
    return { kind: 'view', view: 'faq' };
  }
  if (path === '/contact') {
    return { kind: 'view', view: 'contact' };
  }
  if (path === '/database-metrics') {
    return { kind: 'view', view: 'database-metrics' };
  }
  if (path === '/compound-classes') {
    return { kind: 'view', view: 'compound-classes' };
  }
  if (path === '/genes') {
    return { kind: 'view', view: 'genes' };
  }
  if (path.startsWith('/genes/')) {
    const ko = decodeURIComponent(path.slice('/genes/'.length)).trim();
    if (ko) {
      return { kind: 'gene', ko: ko.toUpperCase() };
    }
  }
  if (path === '/pathways') {
    return { kind: 'view', view: 'pathways' };
  }
  if (path === '/toxicity') {
    return { kind: 'view', view: 'toxicity' };
  }
  if (path === '/visualizations' || path === '/guided-analysis') {
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

  return { kind: 'view', view: 'home' };
}

export function getLegacyRedirectPath(pathname: string) {
  const path = normalizePath(stripBasePath(pathname, CLIENT_BASE_PATH));
  if (path === '/visualizations') {
    return withBasePath('/guided-analysis', CLIENT_BASE_PATH);
  }
  return null;
}

export function resolveAppPath(path: string) {
  return normalizePath(withBasePath(path, CLIENT_BASE_PATH));
}

export function getViewPath(view: View) {
  return VIEW_PATHS[view];
}

export function buildCompoundPath(cpd: string) {
  return `/compounds/${encodeURIComponent(cpd)}`;
}

export function buildGenePath(ko: string) {
  return `/genes/${encodeURIComponent(ko)}`;
}

export function buildCompoundClassPath(compoundclass: string) {
  return `/compound-classes/detail/${encodeURIComponent(compoundclass.trim())}`;
}

export function buildPathwayPath(pathway: string, source?: string) {
  const encodedPathway = encodeURIComponent(pathway.trim());
  const normalizedSource = source?.trim().toUpperCase();
  if (normalizedSource && normalizedSource !== 'ALL') {
    return `/pathways/detail/${encodeURIComponent(normalizedSource)}/${encodedPathway}`;
  }
  return `/pathways/detail/${encodedPathway}`;
}

export function getActiveView(route: Route): View {
  if (route.kind === 'view') {
    return route.view;
  }
  if (route.kind === 'compound') {
    return 'compounds';
  }
  if (route.kind === 'gene') {
    return 'genes';
  }
  if (route.kind === 'compoundClass') {
    return 'compound-classes';
  }
  return 'pathways';
}
