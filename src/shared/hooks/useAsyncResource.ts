import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAsyncResourceOptions<T> {
  enabled?: boolean;
  initialData?: T | null;
  immediate?: boolean;
}

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  options: UseAsyncResourceOptions<T> = {}
) {
  const { enabled = true, initialData = null, immediate = true } = options;
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(Boolean(enabled && immediate));
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const nextData = await loader();
      if (requestIdRef.current !== currentRequestId) {
        return null;
      }
      setData(nextData);
      return nextData;
    } catch (nextError) {
      if (requestIdRef.current === currentRequestId) {
        setError(nextError instanceof Error ? nextError.message : 'Unknown error');
      }
      return null;
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, [loader]);

  useEffect(() => {
    if (!enabled || !immediate) {
      setLoading(false);
      return;
    }

    void reload();

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, immediate, reload]);

  return {
    data,
    error,
    loading,
    reload,
    setData,
  };
}
