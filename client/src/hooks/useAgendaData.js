import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../constants/agendaConstants';

export default function useAgendaData() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinicSettings, setClinicSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      try {
        setIsLoading(true);
        setPageError('');

        const [appointmentsResponse, patientsResponse, doctorsResponse, settingsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/appointments`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/patients`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/doctors`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/settings`, { credentials: 'include' }),
        ]);

        if (!appointmentsResponse.ok || !patientsResponse.ok || !doctorsResponse.ok || !settingsResponse.ok) {
          throw new Error('Failed to load agenda data');
        }

        const [appointmentsData, patientsData, doctorsData, settingsData] = await Promise.all([
          appointmentsResponse.json(),
          patientsResponse.json(),
          doctorsResponse.json(),
          settingsResponse.json(),
        ]);

        if (!isMounted) return;

        setAppointments(appointmentsData);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setClinicSettings(settingsData);
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
    clinicSettings,
    isLoading,
    pageError,
  };
}
