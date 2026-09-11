import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { createPatientRecall, getRecalls, updateRecallStatus } from '../services/recalls';

export const RECALL_STATUS_OPTIONS = ['due', 'scheduled', 'completed', 'dismissed'];
export const RECALL_TRANSITIONS = {
  due: ['scheduled', 'completed', 'dismissed'],
  scheduled: ['due', 'completed', 'dismissed'],
  completed: [],
  dismissed: [],
};

export default function useRecalls({ status = 'open', patientId = null, limit = 100 } = {}) {
  const [recalls, setRecalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchRecalls() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getRecalls({ status, patientId, limit });
        if (mounted) setRecalls(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Failed to load recalls');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    fetchRecalls();
    return () => {
      mounted = false;
    };
  }, [limit, patientId, status]);

  const createRecall = useCallback(async (nextPatientId, payload) => {
    setIsSubmitting(true);
    setError('');
    try {
      const created = await createPatientRecall(nextPatientId, payload);
      const matchesFilter = status === 'all' || status === created.status || (status === 'open' && ['due', 'scheduled'].includes(created.status));
      if (matchesFilter) setRecalls((current) => [created, ...current]);
      return created;
    } catch (createError) {
      setError(createError.message || 'Failed to create recall');
      throw createError;
    } finally {
      setIsSubmitting(false);
    }
  }, [status]);

  const transitionRecall = useCallback(async (recallId, nextStatus) => {
    setIsSubmitting(true);
    setError('');
    try {
      const updated = await updateRecallStatus(recallId, nextStatus);
      setRecalls((current) => {
        const matchesFilter = status === 'all' || status === nextStatus || (status === 'open' && ['due', 'scheduled'].includes(nextStatus));
        return matchesFilter
          ? current.map((recall) => (recall.id === recallId ? updated : recall))
          : current.filter((recall) => recall.id !== recallId);
      });
      return updated;
    } catch (transitionError) {
      setError(transitionError.message || 'Failed to update recall');
      throw transitionError;
    } finally {
      setIsSubmitting(false);
    }
  }, [status]);

  return {
    recalls,
    isLoading,
    error,
    isSubmitting,
    createRecall,
    transitionRecall,
  };
}

export function useRecallOptions() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([apiRequest('/api/patients'), apiRequest('/api/doctors')])
      .then(([patientData, doctorData]) => {
        if (!mounted) return;
        setPatients(Array.isArray(patientData) ? patientData : []);
        setDoctors(Array.isArray(doctorData) ? doctorData : []);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Failed to load recall options');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { patients, doctors, isLoading, error };
}
