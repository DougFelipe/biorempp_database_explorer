function ensureLeadingSlash(value: string) {
  return value.startsWith('/') ? value : `/${value}`;
}

export function normalizeBasePath(value?: string | null) {
  const raw = String(value || '/').trim();
  if (!raw || raw === '/') {
    return '/';
  }
  const withLeading = ensureLeadingSlash(raw);
  return `/${withLeading.replace(/^\/+|\/+$/g, '')}/`;
}

export function stripBasePath(pathname: string, basePath: string) {
  const normalizedBasePath = normalizeBasePath(basePath);
  const rawPath = pathname || '/';
  const normalizedPath = ensureLeadingSlash(rawPath.replace(/\/+$/, '') || '/');

  if (normalizedBasePath === '/') {
    return normalizedPath;
  }

  const withoutTrailing = normalizedBasePath.replace(/\/$/, '');
  if (normalizedPath === withoutTrailing || normalizedPath === normalizedBasePath) {
    return '/';
  }

  let strippedPath = normalizedPath;
  while (strippedPath.startsWith(normalizedBasePath)) {
    const next = strippedPath.slice(normalizedBasePath.length - 1) || '/';
    if (next === strippedPath) {
      break;
    }
    strippedPath = ensureLeadingSlash(next);
    if (strippedPath === withoutTrailing || strippedPath === normalizedBasePath) {
      return '/';
    }
  }

  return strippedPath;
}

export function withBasePath(pathname: string, basePath: string) {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = ensureLeadingSlash((pathname || '/').trim() || '/');

  if (normalizedBasePath === '/') {
    return normalizedPath;
  }

  const withoutBasePrefix = stripBasePath(normalizedPath, normalizedBasePath);
  const withoutTrailing = normalizedBasePath.replace(/\/$/, '');
  if (withoutBasePrefix === '/') {
    return normalizedBasePath;
  }

  return `${withoutTrailing}${withoutBasePrefix}`;
}

export function getClientBasePath() {
  const fromVite = (import.meta.env.VITE_BIOREMPP_URL_BASE_PATH as string | undefined) || import.meta.env.BASE_URL;
  return normalizeBasePath(fromVite || '/');
}
