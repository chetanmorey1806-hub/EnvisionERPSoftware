import { useState, useCallback } from 'react';

export const usePagination = (initialPage = 1, initialLimit = 10) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const handlePageChange = useCallback((newPage) => setPage(newPage), []);
  const handleLimitChange = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1); // Auto-reset cursor index back to first frame
  }, []);

  return { page, limit, setPage, handlePageChange, handleLimitChange };
};