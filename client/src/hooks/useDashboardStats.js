import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboardApi';

/**
 * Live institute metrics. Returns `null` while loading.
 *
 * Zero-data state: a fresh installation has no rows, so these come back as 0 —
 * never as invented placeholder figures.
 */
export const useDashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    dashboardApi.getStats()
      .then((r) => alive && setStats(r.data.data))
      .catch((e) => alive && setError(e.response?.data?.message || 'Unable to load metrics.'));
    return () => { alive = false; };
  }, []);

  return { stats, error, loading: !stats && !error };
};

export default useDashboardStats;
