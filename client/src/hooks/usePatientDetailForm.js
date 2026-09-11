import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

function formatDateInput(dateValue) {
  const value = new Date(dateValue);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function useAppointmentDetailForm({
  appointmentId,
  appointment,
  setAppointment,
  isCompletedAppointment,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('30');
  const [treatmentType, setTreatmentType] = useState('Consultation');
  const [notes, setNotes] = useState('');

  const [performedTreatment, setPerformedTreatment] = useState('Consultation');
  const [completionNotes, setCompletionNotes] = useState('');
  const [afterConcludeAction, setAfterConcludeAction] = useState('finish');

  function syncFormState(nextAppointment) {
    if (!nextAppointment) return;

    setPatientId(String(nextAppointment.patientId));
    setDoctorId(String(nextAppointment.doctorId));
    setDate(formatDateInput(nextAppointment.date));
    setTime(nextAppointment.time || '09:00');
    setDuration(String(nextAppointment.duration || 30));
    setTreatmentType(nextAppointment.treatmentType || 'Consultation');
    setNotes(nextAppointment.notes || '');
  }

  function syncConcludeState(nextAppointment) {
    if (!nextAppointment) return;

    setPerformedTreatment(
      nextAppointment.performedTreatment ||
        nextAppointment.treatmentType ||
        'Consultation'
    );
    setCompletionNotes(nextAppointment.completionNotes || '');
    setAfterConcludeAction('finish');
  }

  useEffect(() => {
    if (!appointment) return;
    // The form is intentionally synchronized after the async appointment fetch completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncFormState(appointment);
    syncConcludeState(appointment);
  }, [appointment]);

  function handleStartEdit() {
    if (!appointment || isCompletedAppointment) return;

    syncFormState(appointment);
    setIsEditing(true);
    setIsConcludeModalOpen(false);
    setIsRescheduleModalOpen(false);
    setSaveSuccess('');
    setSubmitError('');
  }

  function handleCancelEdit() {
    if (!appointment) return;

    syncFormState(appointment);
    setIsEditing(false);
    setSaveSuccess('');
    setSubmitError('');
  }

  function handleOpenConcludeModal() {
    if (!appointment) return;

    syncConcludeState(appointment);
    setIsEditing(false);
    setIsRescheduleModalOpen(false);
    setIsConcludeModalOpen(true);
    setSaveSuccess('');
    setSubmitError('');
  }

  function handleCloseConcludeModal() {
    if (isSubmitting) return;

    syncConcludeState(appointment);
    setIsConcludeModalOpen(false);
    setSubmitError('');
  }

  function handleStartReschedule() {
    if (!appointment || isCompletedAppointment) return;

    syncFormState(appointment);
    setIsEditing(false);
    setIsConcludeModalOpen(false);
    setIsRescheduleModalOpen(true);
    setSaveSuccess('');
    setSubmitError('');
  }

  function handleCloseRescheduleModal() {
    if (isSubmitting) return;

    syncFormState(appointment);
    setIsRescheduleModalOpen(false);
    setSubmitError('');
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!patientId || !doctorId || !date || !time) {
      setSubmitError('Patient, doctor, date and time are required');
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
          patientId: Number(patientId),
          doctorId: Number(doctorId),
          date,
          time,
          duration: Number(duration || 30),
          treatmentType,
          notes,
          status: appointment.status,
          performedTreatment: appointment.performedTreatment || '',
          completionNotes: appointment.completionNotes || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update appointment');
      }

      setAppointment(data);
      setIsEditing(false);
      setIsRescheduleModalOpen(false);
      setSaveSuccess('Appointment saved successfully.');
    } catch (error) {
      setSubmitError(error.message || 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRescheduleAppointment(event) {
    event.preventDefault();

    if (!date || !time) {
      setSubmitError('Date and time are required');
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
          patientId: Number(patientId || appointment.patientId),
          doctorId: Number(doctorId || appointment.doctorId),
          date,
          time,
          duration: Number(duration || 30),
          treatmentType: appointment.treatmentType,
          notes: appointment.notes || '',
          status: appointment.status,
          performedTreatment: appointment.performedTreatment || '',
          completionNotes: appointment.completionNotes || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reschedule appointment');
      }

      setAppointment(data);
      setIsRescheduleModalOpen(false);
      setSaveSuccess('Appointment rescheduled successfully.');
    } catch (error) {
      setSubmitError(error.message || 'Failed to reschedule appointment');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConcludeAppointment(event) {
    event.preventDefault();

    if (!performedTreatment) {
      setSubmitError('Performed treatment is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSaveSuccess('');

      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${appointmentId}/conclude`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            performedTreatment,
            completionNotes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to conclude appointment');
      }

      setAppointment(data);
      setIsConcludeModalOpen(false);
      setSaveSuccess(
        afterConcludeAction === 'followup'
          ? 'Appointment concluded. You can reschedule the follow-up below.'
          : 'Appointment concluded successfully.'
      );

      if (afterConcludeAction === 'followup') {
        syncFormState(data);
        setIsRescheduleModalOpen(true);
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
