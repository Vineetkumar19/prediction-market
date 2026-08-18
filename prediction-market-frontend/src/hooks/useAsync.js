/**
 * useAsync.js
 * Removes the loading/error/data boilerplate that every screen otherwise
 * repeats. Also guards against setting state after unmount.
 *
 *   const { data, loading, error, reload } = useAsync(fetchContests, []);
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAsync(asyncFn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        if (mounted.current) setData(result);
        return result;
      } catch (err) {
        if (mounted.current) setError(err);
        throw err;
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    if (immediate) run().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, immediate]);

  return { data, loading, error, reload: run, setData };
}
