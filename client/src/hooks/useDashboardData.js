/* ================================
   Imports
================================ */
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../constants/agendaConstants';
import {
  buildDashboardUpcomingAppointments,
  filterDashboardPatients,
} from '../utils/dashboardUtils';

/* ================================
   Hook: dashboard page state
================================ */
export default function useDashboardData() {
  /* ================================
     State: raw fetched data
  ================================ */
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);

  /* ================================
     State: UI state
  ================================ */
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  /* ================================
     Effect: load dashboard data
     Keep page fetching isolated here so
     the page component stays presentational.
  ================================ */
  useEffect(() => {
    let isMounted = true;

    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        setPageError('');

        const [patientsResponse, appointmentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/patients`),
          fetch(`${API_BASE_URL}/api/appointments`),
        ]);

        if (!patientsResponse.ok) {
          throw new Error('Failed to load patients');
        }

        if (!appointmentsResponse.ok) {
          throw new Error('Failed to load appointments');
        }

        const [patientsData, appointmentsData] = await Promise.all([
          patientsResponse.json(),
          appointmentsResponse.json(),
        ]);

        if (!isMounted) return;

        setPatients(Array.isArray(patientsData) ? patientsData : []);
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || 'Failed to load dashboard');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ================================
     Derived: filtered patient list
  ================================ */
  const filteredPatients = useMemo(() => {
    return filterDashboardPatients(patients, searchTerm);
  }, [patients, searchTerm]);

  /* ================================
     Derived: sidebar appointments
  ================================ */
  const upcomingAppointments = useMemo(() => {
    return buildDashboardUpcomingAppointments(appointments);
  }, [appointments]);

  return {
    patients,
    appointments,
    searchTerm,
    setSearchTerm,
    isLoading,
    pageError,
    filteredPatients,
    upcomingAppointments,
  };
}