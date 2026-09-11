import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../constants/agendaConstants';

export default function useAgendaData() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      try {
        setIsLoading(true);
        setPageError('');

        const [appointmentsResponse, patientsResponse, doctorsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/appointments`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/patients`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/doctors`, { credentials: 'include' }),
        ]);

        if (!appointmentsResponse.ok || !patientsResponse.ok || !doctorsResponse.ok) {
          throw new Error('Failed to load agenda data');
        }

        const [appointmentsData, patientsData, doctorsData] = await Promise.all([
          appointmentsResponse.json(),
          patientsResponse.json(),
          doctorsResponse.json(),
        ]);

        if (!isMounted) return;

        setAppointments(appointmentsData);
        setPatients(patientsData);
        setDoctors(doctorsData);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || 'Failed to load agenda data');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    appointments,
    setAppointments,
    patients,
    setPatients,
    doctors,
    isLoading,
    pageError,
  };
}
