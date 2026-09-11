/* ================================
   Imports
================================ */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../constants/agendaConstants';
import { formatDateInput } from '../utils/agendaUtils';

/* ================================
   Hook: appointment detail form
   Responsibility:
   - manage edit mode
   - manage conclude workflow
   - manage reschedule workflow
   - submit updates back to the API
================================ */
export default function useAppointmentDetailForm({
  appointmentId,
  appointment,
  setAppointment,
  isTerminalAppointment,
}) {
  const navigate = useNavigate();

  /* ================================
     State: workflow UI
  ================================ */
  const [isEditing, setIsEditing] = useState(false);
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ================================
     State: feedback
  ================================ */
  const [saveSuccess, setSaveSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  /* ================================
     State: editable appointment fields
     These fields are shared by the edit form
     and the reschedule modal when relevant.
  ================================ */
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [treatmentType, setTreatmentType] = useState('');
  const [notes, setNotes] = useState('');

  /* ================================
     State: completion workflow
  ================================ */
  const [performedTreatment, setPerformedTreatment] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [afterConcludeAction, setAfterConcludeAction] = useState('stay');

  /* ================================
     Effect: sync incoming appointment data
     The appointment is fetched asynchronously,
     so local form state must be refreshed when
     the selected appointment changes.
  ================================ */
  useEffect(() => {
    // The form is intentionally synchronized after the async appointment fetch completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatientId(appointment?.patientId ? String(appointment.patientId) : '');
    setDoctorId(appointment?.doctorId ? String(appointment.doctorId) : '');
    setDate(appointment?.date ? formatDateInput(appointment.date) : '');
    setTime(appointment?.time || '');
    setDuration(appointment?.duration ? String(appointment.duration) : '30');
    setTreatmentType(appointment?.treatmentType || '');
    setNotes(appointment?.notes || '');
    setPerformedTreatment(appointment?.performedTreatment || '');
    setCompletionNotes(appointment?.completionNotes || '');
  }, [appointment]);

  /* ================================
     Helpers: reset editable form fields
     Reset to the latest loaded appointment data.
  ================================ */
  function resetFormFromAppointment() {
    setPatientId(appointment?.patientId ? String(appointment.patientId) : '');
    setDoctorId(appointment?.doctorId ? String(appointment.doctorId) : '');
    setDate(appointment?.date ? formatDateInput(appointment.date) : '');
    setTime(appointment?.time || '');
    setDuration(appointment?.duration ? String(appointment.duration) : '30');
    setTreatmentType(appointment?.treatmentType || '');
    setNotes(appointment?.notes || '');
  }

  /* ================================
     Handlers: edit workflow
  ================================ */
  function handleStartEdit() {
    if (!appointment || isTerminalAppointment) return;

    resetFormFromAppointment();
    setSubmitError('');
    setSaveSuccess('');
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (!appointment) return;

    resetFormFromAppointment();
    setSubmitError('');
    setSaveSuccess('');
    setIsEditing(false);
  }

  /* ================================
     Handlers: conclude modal
  ================================ */
  function handleOpenConcludeModal() {
    if (!appointment || isTerminalAppointment) return;

    setSubmitError('');
    setSaveSuccess('');
    setPerformedTreatment(appointment?.performedTreatment || appointment?.treatmentType || '');
    setCompletionNotes(appointment?.completionNotes || '');
    setAfterConcludeAction('stay');
    setIsConcludeModalOpen(true);
  }

  function handleCloseConcludeModal() {
    if (isSubmitting) return;

    setIsConcludeModalOpen(false);
    setSubmitError('');
  }

  /* ================================
     Handlers: reschedule modal
     Rescheduling only updates date, time
     and duration while preserving the rest
     of the appointment data.
  ================================ */
  function handleStartReschedule() {
    if (!appointment || isTerminalAppointment) return;

    setSubmitError('');
    setSaveSuccess('');
    setDate(appointment?.date ? formatDateInput(appointment.date) : '');
    setTime(appointment?.time || '');
    setDuration(appointment?.duration ? String(appointment.duration) : '30');
    setIsRescheduleModalOpen(true);
  }

  function handleCloseRescheduleModal() {
    if (isSubmitting) return;

    setSubmitError('');
    setIsRescheduleModalOpen(false);
  }

  /* ================================
     Handlers: save full appointment edit
  ================================ */
  async function handleSave(event) {
    event.preventDefault();

    if (!appointmentId) return;

    if (!patientId || !doctorId) {
      setSubmitError('Patient and doctor are required');
      return;
    }

    const unchangedDate = appointment?.date
      ? formatDateInput(appointment.date)
      : date;
    const unchangedTime = appointment?.time || time;
    const unchangedDuration = Number(appointment?.duration || duration || 30);

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSaveSuccess('');

      const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: Number(patientId),
          doctorId: Number(doctorId),
          date: unchangedDate,
          time: unchangedTime,
          duration: unchangedDuration,
          treatmentType: treatmentType.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update appointment');
      }

      setAppointment(data);
      setIsEditing(false);
      setSaveSuccess('Appointment updated successfully.');
    } catch (error) {
      setSubmitError(error.message || 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ================================
     Handlers: save reschedule
     Uses the same update endpoint, but only
     changes scheduling fields in the payload
     while preserving the remaining values.
  ================================ */
  async function handleRescheduleAppointment(event) {
    event.preventDefault();

    if (!appointmentId || !appointment) return;

    if (!date || !time) {
      setSubmitError('Date and time are required');
      return;
    }

    const normalizedTime = String(time).slice(0, 5);

    if (!/^\d{2}:(00|30)$/.test(normalizedTime)) {
      setSubmitError('Please choose a 30-minute time slot such as 09:00 or 09:30');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSaveSuccess('');

      const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: Number(appointment.patientId),
          doctorId: Number(appointment.doctorId),
          date,
          time: normalizedTime,
          duration: Number(duration || 30),
          treatmentType: appointment.treatmentType || '',
          notes: appointment.notes || '',
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reschedule appointment');
      }

      setAppointment(data);
      setDate(data?.date ? formatDateInput(data.date) : date);
      setTime(data?.time || normalizedTime);
      setDuration(data?.duration ? String(data.duration) : String(duration));
      setIsRescheduleModalOpen(false);
      setSaveSuccess('Appointment rescheduled successfully.');
      navigate(`/agenda?date=${encodeURIComponent(date)}`);
    } catch (error) {
      setSubmitError(error.message || 'Failed to reschedule appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ================================
     Handlers: conclude appointment
     Marks the appointment as completed
     and optionally redirects afterwards.
  ================================ */
  async function handleConcludeAppointment(event) {
    event.preventDefault();

    if (!appointmentId || !appointment) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSaveSuccess('');

      const response = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: Number(appointment.patientId),
          doctorId: Number(appointment.doctorId),
          date: formatDateInput(appointment.date),
          time: appointment.time,
          duration: Number(appointment.duration || 30),
          treatmentType: appointment.treatmentType || '',
          notes: appointment.notes || '',
          status: 'completed',
          performedTreatment: performedTreatment.trim(),
          completionNotes: completionNotes.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to conclude appointment');
      }

      setAppointment(data);
      setIsConcludeModalOpen(false);
      setSaveSuccess('Appointment concluded successfully.');

      if (afterConcludeAction === 'agenda') {
        navigate('/agenda');
      }
    } catch (error) {
      setSubmitError(error.message || 'Failed to conclude appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isEditing,
    isConcludeModalOpen,
    isRescheduleModalOpen,
    saveSuccess,
    submitError,
    isSubmitting,
    patientId,
    doctorId,
    date,
    time,
    duration,
    treatmentType,
    notes,
    performedTreatment,
    completionNotes,
    afterConcludeAction,
    setPatientId,
    setDoctorId,
    setDate,
    setTime,
    setDuration,
    setTreatmentType,
    setNotes,
    setPerformedTreatment,
    setCompletionNotes,
    setAfterConcludeAction,
    handleStartEdit,
    handleCancelEdit,
    handleOpenConcludeModal,
    handleCloseConcludeModal,
    handleStartReschedule,
    handleCloseRescheduleModal,
    handleSave,
    handleRescheduleAppointment,
    handleConcludeAppointment,
  };
}
