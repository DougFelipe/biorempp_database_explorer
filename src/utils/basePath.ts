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
  if (normalizedPath.startsWith(normalizedBasePath)) {
    const stripped = normalizedPath.slice(normalizedBasePath.length - 1);
    return stripped || '/';
  }
  return normalizedPath;
}

export function withBasePath(pathname: string, basePath: string) {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = ensureLeadingSlash((pathname || '/').trim() || '/');

  if (normalizedBasePath === '/') {
    return normalizedPath;
  }

  const withoutTrailing = normalizedBasePath.replace(/\/$/, '');
  if (normalizedPath === withoutTrailing || normalizedPath.startsWith(normalizedBasePath)) {
    return normalizedPath;
  }

  if (normalizedPath === '/') {
    return normalizedBasePath;
  }

  return `${withoutTrailing}${normalizedPath}`;
}

export function getClientBasePath() {
  const fromVite = (import.meta.env.VITE_BIOREMPP_URL_BASE_PATH as string | undefined) || import.meta.env.BASE_URL;
  return normalizeBasePath(fromVite || '/');
}
