/* ================================
   Imports
================================ */
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, TIME_OPTIONS } from '../constants/agendaConstants';
import {
  buildCalendarDays,
  formatDateInput,
  getAppointmentDateTime,
  getPatientDisplayName,
  isSameDay,
  startOfDay,
} from '../utils/agendaUtils';

const CLINIC_TIME_OPTIONS = TIME_OPTIONS.filter(
  (time) => time >= '08:00' && time <= '19:30'
);

/* ================================
   Hook
================================ */
export default function useAppointmentForm({
  selectedDate,
  patients,
  doctors,
  appointments,
  setAppointments,
  setSelectedDate,
}) {
  /* ================================
     State: modal and form mode
  ================================ */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);

  /* ================================
     State: patient and doctor selectors
  ================================ */
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [patientSelectorOpen, setPatientSelectorOpen] = useState(false);
  const [doctorSelectorOpen, setDoctorSelectorOpen] = useState(false);

  /* ================================
     State: appointment details
  ================================ */
  const [appointmentDate, setAppointmentDate] = useState(formatDateInput(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfDay(new Date()));
  const [calendarSelection, setCalendarSelection] = useState(startOfDay(new Date()));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [duration, setDuration] = useState('30');
  const [treatmentType, setTreatmentType] = useState('Consultation');
  const [notes, setNotes] = useState('');

  /* ================================
     State: submit status
  ================================ */
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [availabilityError, setAvailabilityError] = useState('');
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);

  /* ================================
     Derived: recommended patients
  ================================ */
  const recommendedPatientIds = useMemo(() => {
    return new Set(
      appointments
        .filter((appointment) => isSameDay(`${appointmentDate}T00:00:00`, appointment.date))
        .map((appointment) => appointment.patientId)
    );
  }, [appointments, appointmentDate]);

  /* ================================
     Derived: patient search
  ================================ */
  const patientSearchResults = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();

    if (!term) return patients;

    return patients.filter((patient) => {
      const fullName = getPatientDisplayName(patient).toLowerCase();
      const phone = String(patient.phone || '').toLowerCase();
      return fullName.includes(term) || phone.includes(term);
    });
  }, [patients, patientSearch]);

  /* ================================
     Derived: doctor search
  ================================ */
  const doctorSearchResults = useMemo(() => {
    const term = doctorSearch.trim().toLowerCase();

    if (!term) return doctors;

    return doctors.filter((doctor) => {
      const name = String(doctor.name || '').toLowerCase();
      const email = String(doctor.email || '').toLowerCase();
      const phone = String(doctor.phone || '').toLowerCase();

      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [doctors, doctorSearch]);

  /* ================================
     Derived: calendar days
  ================================ */
  const appointmentCalendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth]
  );

  const timeOptions = useMemo(() => {
    const options = availabilitySlots.length > 0
      ? availabilitySlots
      : CLINIC_TIME_OPTIONS.map((time) => ({
          time,
          status: doctorId ? 'loading' : 'select-doctor',
        }));

    if (
      editingAppointmentId &&
      appointmentTime &&
      !options.some((option) => option.time === appointmentTime)
    ) {
      return [
        ...options,
        { time: appointmentTime, status: 'existing' },
      ].sort((first, second) => first.time.localeCompare(second.time));
    }

    return options;
  }, [appointmentTime, availabilitySlots, doctorId, editingAppointmentId]);

  useEffect(() => {
    if (!isModalOpen || !doctorId || !appointmentDate) {
      // Availability is intentionally reset when the form has no doctor/date context.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailabilitySlots([]);
      setAvailabilityError('');
      setIsAvailabilityLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function loadAvailability() {
      try {
        // Availability is loaded from the same interval engine used by rescheduling.
        setIsAvailabilityLoading(true);
        setAvailabilityError('');

        const query = new URLSearchParams({
          doctorId: String(doctorId),
          date: appointmentDate,
          duration: String(duration || 30),
        });

        if (editingAppointmentId) {
          query.set('excludeAppointmentId', String(editingAppointmentId));
        }

        const response = await fetch(`${API_BASE_URL}/api/appointments/availability?${query}`, {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || 'Failed to load doctor availability');
        }

        const nextSlots = Array.isArray(data?.slots) ? data.slots : [];
        setAvailabilitySlots(nextSlots);

        setAppointmentTime((currentTime) => {
          const currentSlot = nextSlots.find((slot) => slot.time === currentTime);
          if (currentSlot?.status === 'free' || currentSlot?.status === 'existing') {
            return currentTime;
          }

          return nextSlots.find((slot) => slot.status === 'free')?.time || currentTime;
        });
      } catch (error) {
        if (error.name === 'AbortError') return;
        setAvailabilitySlots([]);
        setAvailabilityError(error.message || 'Failed to load doctor availability');
      } finally {
        if (!controller.signal.aborted) {
          setIsAvailabilityLoading(false);
        }
      }
    }

    loadAvailability();

    return () => controller.abort();
  }, [appointmentDate, doctorId, duration, editingAppointmentId, isModalOpen]);

  /* ================================
     Helpers: reset form state
  ================================ */
  function resetFormState(baseSelectedDate = selectedDate) {
    const baseDate = startOfDay(baseSelectedDate);

    setEditingAppointmentId(null);
    setPatientId('');
    setDoctorId('');
    setPatientSearch('');
    setDoctorSearch('');
    setPatientSelectorOpen(false);
    setDoctorSelectorOpen(false);
    setAppointmentDate(formatDateInput(baseDate));
    setCalendarMonth(baseDate);
    setCalendarSelection(baseDate);
    setIsCalendarOpen(false);
    setAppointmentTime('09:00');
    setDuration('30');
    setTreatmentType('Consultation');
    setNotes('');
    setSubmitError('');
  }

  /* ================================
     Actions: open create modal
  ================================ */
  function openCreateModal(date = selectedDate) {
    const normalizedDate = startOfDay(date);

    resetFormState(normalizedDate);
    setAppointmentDate(formatDateInput(normalizedDate));
    setCalendarMonth(normalizedDate);
    setCalendarSelection(normalizedDate);
    setIsCalendarOpen(false);
    setIsModalOpen(true);
  }

  /* ================================
     Actions: open edit modal
  ================================ */
  function openEditModal(appointment) {
    const normalizedDate = startOfDay(new Date(appointment.date));

    setEditingAppointmentId(appointment.id);
    setPatientId(String(appointment.patientId));
    setDoctorId(String(appointment.doctorId));

    const foundPatient = patients.find((patient) => patient.id === appointment.patientId);
    const foundDoctor = doctors.find((doctor) => doctor.id === appointment.doctorId);

    setPatientSearch(foundPatient ? getPatientDisplayName(foundPatient) : '');
    setDoctorSearch(foundDoctor ? foundDoctor.name : '');
    setPatientSelectorOpen(false);
    setDoctorSelectorOpen(false);
    setAppointmentDate(formatDateInput(appointment.date));
    setCalendarMonth(normalizedDate);
    setCalendarSelection(normalizedDate);
    setIsCalendarOpen(false);
    setAppointmentTime(appointment.time);
    setDuration(String(appointment.duration || 30));
    setTreatmentType(appointment.treatmentType || 'Consultation');
    setNotes(appointment.notes || '');
    setSubmitError('');
    setIsModalOpen(true);
  }

  /* ================================
     Actions: close modal
  ================================ */
  function closeModal() {
    if (isSubmitting) return;

    setIsModalOpen(false);
    resetFormState();
  }

  /* ================================
     Actions: calendar controls
  ================================ */
  function handleCalendarMonthChange(amount) {
    setCalendarMonth((currentValue) => {
      const nextMonth = new Date(currentValue);
      nextMonth.setMonth(currentValue.getMonth() + amount);
      return startOfDay(nextMonth);
    });
  }

  function handleCalendarDateSelect(date) {
    const normalizedDate = startOfDay(date);
    setCalendarSelection(normalizedDate);
    setAppointmentDate(formatDateInput(normalizedDate));
    setIsCalendarOpen(false);
  }

  function handleTodaySelect() {
    const today = startOfDay(new Date());
    setCalendarMonth(today);
    handleCalendarDateSelect(today);
  }

  /* ================================
     Actions: selector inputs
  ================================ */
  function handlePatientSearchChange(value) {
    setPatientSearch(value);
    setPatientId('');
    setPatientSelectorOpen(true);
  }

  function handleDoctorSearchChange(value) {
    setDoctorSearch(value);
    setDoctorId('');
    setDoctorSelectorOpen(true);
  }

  function handleSelectPatient(patient) {
    setPatientId(String(patient.id));
    setPatientSearch(getPatientDisplayName(patient));
    setPatientSelectorOpen(false);
  }

  function handleSelectDoctor(doctor) {
    setDoctorId(String(doctor.id));
    setDoctorSearch(doctor.name || '');
    setDoctorSelectorOpen(false);
  }

  /* ================================
     Actions: save appointment
  ================================ */
  async function handleSubmit(event) {
    event.preventDefault();

    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      setSubmitError('Patient, doctor, date and time are required');
      return;
    }

    const normalizedTime = String(appointmentTime).slice(0, 5);

    const existingAppointment = appointments.find(
      (appointment) => appointment.id === editingAppointmentId
    );
    const keepsLegacyTime = existingAppointment?.time === normalizedTime;

    if (!/^\d{2}:(00|30)$/.test(normalizedTime) && !keepsLegacyTime) {
      setSubmitError('Please choose a 30-minute time slot such as 09:00 or 09:30');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');

      const payload = {
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        date: appointmentDate,
        time: normalizedTime,
        duration: Number(duration || 30),
        treatmentType,
        notes,
      };

      const response = await fetch(
        editingAppointmentId
          ? `${API_BASE_URL}/api/appointments/${editingAppointmentId}`
          : `${API_BASE_URL}/api/appointments`,
        {
          method: editingAppointmentId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const rawText = await response.text();
      const data = rawText ? JSON.parse(rawText) : null;

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to save appointment');
      }

      if (editingAppointmentId) {
        setAppointments((currentAppointments) =>
          currentAppointments.map((appointment) =>
            appointment.id === editingAppointmentId ? data : appointment
          )
        );
      } else {
        setAppointments((currentAppointments) =>
          [...currentAppointments, data].sort(
            (first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second)
          )
        );
      }

      setSelectedDate(startOfDay(new Date(`${payload.date}T00:00:00`)));
      closeModal();
    } catch (error) {
      setSubmitError(error.message || 'Failed to save appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isModalOpen,
    editingAppointmentId,
    patientId,
    doctorId,
    patientSearch,
    doctorSearch,
    patientSelectorOpen,
    doctorSelectorOpen,
    appointmentDate,
    calendarMonth,
    calendarSelection,
    isCalendarOpen,
    appointmentTime,
    duration,
    treatmentType,
    notes,
    submitError,
    isSubmitting,
    recommendedPatientIds,
    patientSearchResults,
    doctorSearchResults,
    appointmentCalendarDays,
    timeOptions,
    availabilityError,
    isAvailabilityLoading,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleCalendarMonthChange,
    handleCalendarDateSelect,
    handleTodaySelect,
    setIsCalendarOpen,
    handlePatientSearchChange,
    handleDoctorSearchChange,
    handleSelectPatient,
    handleSelectDoctor,
    setPatientSelectorOpen,
    setDoctorSelectorOpen,
    setAppointmentTime,
    setDuration,
    setTreatmentType,
    setNotes,
  };
}
