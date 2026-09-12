import { useCallback, useEffect, useState } from 'react';
import { getWorkQueue } from '../services/workQueue';
import useLanguage from '../context/useLanguage';

export default function useWorkQueue() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setData(await getWorkQueue());
    } catch (requestError) {
      setError(requestError.message || t('Failed to load work queue'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let isMounted = true;
    async function loadQueue() {
      try {
        setIsLoading(true);
        setError('');
        const nextData = await getWorkQueue();
        if (isMounted) setData(nextData);
      } catch (requestError) {
        if (isMounted) setError(requestError.message || t('Failed to load work queue'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadQueue();
    return () => { isMounted = false; };
  }, [t]);

  return { data, isLoading, error, refresh };
}
