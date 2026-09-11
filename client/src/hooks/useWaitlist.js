import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { createPatientWaitlistEntry, getWaitlist, updateWaitlistStatus } from '../services/waitlist';

export const WAITLIST_TRANSITIONS = {
  waiting: ['contacted', 'booked', 'removed'],
  contacted: ['waiting', 'booked', 'removed'],
  booked: [],
  removed: [],
};

function apiStatus(status) {
  return status === 'active' ? 'waiting,contacted' : status;
}

export default function useWaitlist({ status = 'active', patientId = null, limit = 100 } = {}) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const data = await getWaitlist({ status: apiStatus(status), patientId, limit });
        if (mounted) setEntries(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Failed to load waitlist');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [limit, patientId, status]);

  const createEntry = useCallback(async (nextPatientId, payload) => {
    setIsSubmitting(true);
    setError('');
    try {
      const created = await createPatientWaitlistEntry(nextPatientId, payload);
      const matches = status === 'all' || (status === 'active' && ['waiting', 'contacted'].includes(created.status)) || status === created.status;
      if (matches) setEntries((current) => [created, ...current]);
      return created;
    } catch (submitError) {
      setError(submitError.message || 'Failed to create waitlist entry');
      throw submitError;
    } finally {
      setIsSubmitting(false);
    }
  }, [status]);

  const transitionEntry = useCallback(async (entryId, nextStatus) => {
    setIsSubmitting(true);
    setError('');
    try {
      const updated = await updateWaitlistStatus(entryId, nextStatus);
      const matches = status === 'all' || (status === 'active' && ['waiting', 'contacted'].includes(nextStatus)) || status === nextStatus;
      setEntries((current) => matches ? current.map((entry) => entry.id === entryId ? updated : entry) : current.filter((entry) => entry.id !== entryId));
      return updated;
    } catch (transitionError) {
      setError(transitionError.message || 'Failed to update waitlist entry');
      throw transitionError;
    } finally {
      setIsSubmitting(false);
    }
  }, [status]);

  return { entries, isLoading, error, isSubmitting, createEntry, transitionEntry };
}

export function useWaitlistOptions() {
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
      .catch((loadError) => { if (mounted) setError(loadError.message || 'Failed to load waitlist options'); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  return { patients, doctors, isLoading, error };
}
