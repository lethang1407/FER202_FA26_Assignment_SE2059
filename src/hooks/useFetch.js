import { useCallback, useEffect, useRef, useState } from 'react';

const errorMessage = (error) =>
  error instanceof Error ? error.message : 'Đã xảy ra lỗi, vui lòng thử lại';

export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const mounted = useRef(false);

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (mounted.current && currentRequestId === requestId.current) {
        setData(result);
      }
    } catch (fetchError) {
      if (mounted.current && currentRequestId === requestId.current) {
        setError(errorMessage(fetchError));
      }
    } finally {
      if (mounted.current && currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  // fetcher is intentionally refreshed when the caller-supplied dependencies change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    load();

    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [load]);

  return { data, loading, error, reload: load };
}
