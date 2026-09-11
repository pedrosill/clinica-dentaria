/* ================================
   Imports
================================ */
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../constants/patientDetailConstants';
import { getAppointmentDateTime, startOfDay } from '../utils/patientDetailUtils';
import { isActiveAppointmentStatus } from '../utils/agendaUtils';

/* ================================
   Hook: patient detail data
================================ */
export default function usePatientDetailData(patientId) {
  /* ================================
     State: fetched data
  ================================ */
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  /* ================================
     Effect: load page data
  ================================ */
  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      if (patientId === null) {
        if (!isMounted) return;
        setPatient(null);
        setAppointments([]);
        setPageError('Invalid patient id');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setPageError('');

        const response = await fetch(`${API_BASE_URL}/api/patients/${patientId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.message || 'Failed to load patient details');
        }

        const data = await response.json();

        if (!isMounted) return;

        const normalizedPatient = data?.patient ?? data ?? null;
        const normalizedAppointments = Array.isArray(data?.appointments)
          ? data.appointments
          : Array.isArray(normalizedPatient?.appointments)
          ? normalizedPatient.appointments
          : [];

        setPatient(normalizedPatient);
        setAppointments(normalizedAppointments);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || 'Failed to load patient details');
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
  }, [patientId]);

  /* ================================
     Derived: reference day
  ================================ */
  const today = useMemo(() => startOfDay(new Date()), []);

  /* ================================
     Derived: upcoming appointments
  ================================ */
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const appointmentDateTime = getAppointmentDateTime(appointment);
        return appointmentDateTime >= today && isActiveAppointmentStatus(appointment.status);
      })
      .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second));
  }, [appointments, today]);

  /* ================================
     Derived: recent completed appointments
  ================================ */
  const recentCompletedAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.status === 'completed')
      .sort((first, second) => getAppointmentDateTime(second) - getAppointmentDateTime(first))
      .slice(0, 5);
  }, [appointments]);

  return {
    patient,
    setPatient,
    appointments,
    setAppointments,
    isLoading,
    pageError,
    upcomingAppointments,
    recentCompletedAppointments,
  };
}
