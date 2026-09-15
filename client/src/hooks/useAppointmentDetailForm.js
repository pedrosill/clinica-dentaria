/* ================================
   Imports
================================ */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { formatDateInput } from '../utils/agendaUtils';
import useLanguage from '../context/useLanguage';
import { uploadPatientDocument } from '../services/patients';

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
  const { t } = useLanguage();

  /* ================================
     State: workflow UI
  ================================ */
  const [isEditing, setIsEditing] = useState(false);
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isFollowUpReschedule, setIsFollowUpReschedule] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
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
  const [treatments, setTreatments] = useState([]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
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
    setTreatments(appointment?.clinicalNote?.treatments?.length
      ? appointment.clinicalNote.treatments.map((item) => ({ procedureName: item.procedureName, toothNumber: item.toothNumber || '', surface: item.surface || '', notes: item.notes || '', toothCondition: '', toothStatus: 'completed' }))
      : [{ procedureName: appointment?.performedTreatment || appointment?.treatmentType || '', toothNumber: '', surface: '', notes: '', toothCondition: '', toothStatus: 'completed' }]);
    setEvidenceFiles([]);
    setCompletionNotes(appointment?.completionNotes || '');
    setAfterConcludeAction('finish');
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
    setIsFollowUpReschedule(false);
    setIsRescheduleModalOpen(true);
  }

  function handleCloseRescheduleModal() {
    if (isSubmitting) return;

    setSubmitError('');
    setIsRescheduleModalOpen(false);
  }

  function handleOpenCancelModal() {
    if (!appointment || isTerminalAppointment) return;

    setSubmitError('');
    setSaveSuccess('');
    setIsCancelModalOpen(true);
  }

  function handleCloseCancelModal() {
    if (isSubmitting) return;

    setSubmitError('');
    setIsCancelModalOpen(false);
  }

  /* ================================
     Handlers: save full appointment edit
  ================================ */
  async function handleSave(event) {
    event.preventDefault();

    if (!appointmentId) return;

    if (!patientId || !doctorId) {
      setSubmitError(t('Patient and doctor are required'));
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

      const data = await apiRequest(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
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

      setAppointment(data);
      setIsEditing(false);
      setSaveSuccess(t('Appointment updated successfully.'));
    } catch (error) {
      setSubmitError(error.message || t('Failed to update appointment'));
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
      setSubmitError(t('Date and time are required'));
      return;
    }

    const normalizedTime = String(time).slice(0, 5);

    if (!/^\d{2}:(00|30)$/.test(normalizedTime)) {
      setSubmitError(t('Please choose a 30-minute time slot such as 09:00 or 09:30'));
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSaveSuccess('');

      const data = await apiRequest(
        isFollowUpReschedule ? '/api/appointments' : `/api/appointments/${appointmentId}`,
        {
          method: isFollowUpReschedule ? 'POST' : 'PUT',
          body: JSON.stringify({
            patientId: Number(appointment.patientId),
            doctorId: Number(appointment.doctorId),
            date,
            time: normalizedTime,
            duration: Number(duration || 30),
            treatmentType: appointment.treatmentType || '',
            notes: appointment.notes || '',
          }),
        }
      );

      if (!isFollowUpReschedule) {
        setAppointment(data);
        setDate(data?.date ? formatDateInput(data.date) : date);
        setTime(data?.time || normalizedTime);
        setDuration(data?.duration ? String(data.duration) : String(duration));
      }
      setIsRescheduleModalOpen(false);
      setIsFollowUpReschedule(false);
      setSaveSuccess(t(isFollowUpReschedule ? 'Follow-up appointment created successfully.' : 'Appointment rescheduled successfully.'));
      navigate(`/agenda?date=${encodeURIComponent(date)}`);
    } catch (error) {
      setSubmitError(error.message || t('Failed to reschedule appointment'));
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

      const completedTreatments = treatments.filter((item) => item.procedureName?.trim());
      if (completedTreatments.length === 0) {
        setSubmitError(t('At least one treatment is required'));
        return;
      }

      const data = await apiRequest(`/api/appointments/${appointmentId}/conclude`, {
        method: 'PATCH',
        body: JSON.stringify({
          performedTreatment: completedTreatments.map((item) => item.procedureName.trim()).join(', '),
          treatments: completedTreatments.map((item) => ({
            ...item,
            procedureName: item.procedureName.trim(),
            toothNumber: item.toothNumber?.trim() || '',
            toothCondition: item.toothCondition || '',
            toothStatus: item.toothStatus || 'completed',
            notes: item.notes?.trim() || '',
          })),
          completionNotes: completionNotes.trim(),
        }),
      });

      let evidenceUploadFailed = false;
      if (evidenceFiles.length > 0) {
        try {
          const uploadedEvidence = await Promise.all(evidenceFiles.map((file) => uploadPatientDocument(data.patientId, file, data.id)));
          data.documents = [...(data.documents || []), ...uploadedEvidence];
        } catch {
          evidenceUploadFailed = true;
        }
      }

      setAppointment(data);
      setIsConcludeModalOpen(false);
      setSaveSuccess(t(evidenceUploadFailed ? 'Appointment concluded, but some evidence could not be uploaded.' : 'Appointment concluded successfully.'));

      if (afterConcludeAction === 'follow_up') {
        const followUpDate = new Date(`${formatDateInput(data.date || appointment.date)}T00:00:00`);
        followUpDate.setDate(followUpDate.getDate() + 1);
        setDate(formatDateInput(followUpDate));
        setTime('09:00');
        setDuration(String(data.duration || appointment.duration || 30));
        setIsFollowUpReschedule(true);
        setIsRescheduleModalOpen(true);
      }
    } catch (error) {
      setSubmitError(error.message || t('Failed to conclude appointment'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(nextStatus) {
    if (!appointmentId || !appointment || isTerminalAppointment) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSaveSuccess('');

      const data = await apiRequest(`/api/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      setAppointment(data);
      setSaveSuccess(t('Appointment status updated successfully.'));
      return true;
    } catch (error) {
      setSubmitError(error.message || t('Failed to update appointment status'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelAppointment() {
    const didUpdate = await handleStatusChange('cancelled');
    if (didUpdate) {
      setIsCancelModalOpen(false);
      setSaveSuccess(t('Appointment cancelled successfully.'));
    }
  }

  return {
    isEditing,
    isConcludeModalOpen,
    isRescheduleModalOpen,
    isFollowUpReschedule,
    isCancelModalOpen,
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
    treatments,
    evidenceFiles,
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
    setTreatments,
    setEvidenceFiles,
    setCompletionNotes,
    setAfterConcludeAction,
    handleStartEdit,
    handleCancelEdit,
    handleOpenConcludeModal,
    handleCloseConcludeModal,
    handleStartReschedule,
    handleCloseRescheduleModal,
    handleOpenCancelModal,
    handleCloseCancelModal,
    handleSave,
    handleRescheduleAppointment,
    handleConcludeAppointment,
    handleStatusChange,
    handleCancelAppointment,
  };
}
