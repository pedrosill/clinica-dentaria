/* ================================
   Imports
================================ */
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../constants/agendaConstants';
import {
  getAppointmentDateTime,
  isTerminalAppointmentStatus,
} from '../utils/agendaUtils';

/* ================================
   Hook: appointment detail data
   Responsibility:
   - load the selected appointment
   - load supporting patient/doctor lists
   - derive related appointments
================================ */
export default function useAppointmentDetailData(appointmentId) {
  /* ================================
     State: fetched data
  ================================ */
  const [appointment, setAppointment] = useState(null);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);

  /* ================================
     State: page status
  ================================ */
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  /* ================================
     Effect: load page data
     The page passes a normalized numeric
     appointment id into this hook.
  ================================ */
  useEffect(() => {
    let isMounted = true;

    async function loadAppointmentDetailData() {
      if (appointmentId === null) {
        if (!isMounted) return;
        setAppointment(null);
        setPatients([]);
        setDoctors([]);
        setAppointmentTypes([]);
        setAllAppointments([]);
        setPageError('Invalid appointment id');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setPageError('');

        const [
          appointmentResponse,
          patientsResponse,
          doctorsResponse,
          appointmentsResponse,
          settingsResponse,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/patients`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/doctors`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/appointments`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/settings`, { credentials: 'include' }),
        ]);

        if (!appointmentResponse.ok) {
          const errorData = await appointmentResponse.json().catch(() => null);
          throw new Error(errorData?.message || 'Failed to load appointment details');
        }

        if (!patientsResponse.ok) {
          throw new Error('Failed to load patients');
        }

        if (!doctorsResponse.ok) {
          throw new Error('Failed to load doctors');
        }

        if (!appointmentsResponse.ok) {
          throw new Error('Failed to load appointments');
        }

        const [
          appointmentData,
          patientsData,
          doctorsData,
          appointmentsData,
          settingsData,
        ] = await Promise.all([
          appointmentResponse.json(),
          patientsResponse.json(),
          doctorsResponse.json(),
          appointmentsResponse.json(),
          settingsResponse.json(),
        ]);

        if (!isMounted) return;

        setAppointment(appointmentData ?? null);
        setPatients(Array.isArray(patientsData) ? patientsData : []);
        setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
        setAllAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        setAppointmentTypes(Array.isArray(settingsData?.appointmentTypes) ? settingsData.appointmentTypes : []);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || 'Failed to load appointment details');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAppointmentDetailData();

    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  /* ================================
     Derived: appointment completion status
     Keep this here so the page stays
     focused on rendering only.
  ================================ */
  const isCompletedAppointment = useMemo(() => {
    return appointment?.status === 'completed';
  }, [appointment]);

  const isTerminalAppointment = useMemo(() => {
    return isTerminalAppointmentStatus(appointment?.status);
  }, [appointment]);

  /* ================================
     Derived: related appointments
     Related means:
     - same patient
     - not the current appointment
     - nearest first
  ================================ */
  const relatedAppointments = useMemo(() => {
    if (!appointment?.patientId) {
      return [];
    }

    return allAppointments
      .filter((item) => {
        return item.patientId === appointment.patientId && item.id !== appointment.id;
      })
      .sort((first, second) => getAppointmentDateTime(second) - getAppointmentDateTime(first))
      .slice(0, 6);
  }, [allAppointments, appointment]);

  return {
    appointment,
    setAppointment,
    patients,
    doctors,
    appointmentTypes,
    isLoading,
    pageError,
    relatedAppointments,
    isCompletedAppointment,
    isTerminalAppointment,
  };
}
