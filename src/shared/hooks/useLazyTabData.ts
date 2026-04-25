import { useEffect, useMemo, useRef, useState } from 'react';

interface UseLazyTabDataOptions<T> {
  isActive: boolean;
  fetcher: () => Promise<T>;
  resetKeys?: unknown[];
}

export interface LazyTabDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  hasLoaded: boolean;
  reload: () => void;
}

export function useLazyTabData<T>({
  isActive,
  fetcher,
  resetKeys = [],
}: UseLazyTabDataOptions<T>): LazyTabDataState<T> {
  const fetcherRef = useRef(fetcher);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);

  const resetSignature = useMemo(() => JSON.stringify(resetKeys), [resetKeys]);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setHasLoaded(false);
    setLoadedVersion(null);
  }, [resetSignature]);

  useEffect(() => {
    if (!isActive || (hasLoaded && loadedVersion === reloadVersion)) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetcherRef.current();
        if (cancelled) {
          return;
        }
        setData(response);
        setHasLoaded(true);
        setLoadedVersion(reloadVersion);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setData(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load tab content.');
        setHasLoaded(false);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [hasLoaded, isActive, loadedVersion, reloadVersion, resetSignature]);

  function reload() {
    setHasLoaded(false);
    setLoadedVersion(null);
    setReloadVersion((current) => current + 1);
  }

  return {
    data,
    loading,
    error,
    hasLoaded,
    reload,
  };
}
