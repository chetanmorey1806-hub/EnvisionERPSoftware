import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export const useAxios = () => {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (config) => {
    setLoading(true);
    setError('');
    try {
      const res = await api(config);
      setResponse(res.data);
      return res.data;
    } catch (err) {
      const errMsg = err.response?.data?.message || 'A network communication error has occurred.';
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { response, error, loading, execute };
};