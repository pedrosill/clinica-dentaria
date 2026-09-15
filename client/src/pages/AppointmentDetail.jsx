/* ================================
   Imports
================================ */
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppointmentDetailHeader from '../components/appointment-detail/AppointmentDetailHeader';
import AppointmentInfoSection from '../components/appointment-detail/AppointmentInfoSection';
import AppointmentPatientCard from '../components/appointment-detail/AppointmentPatientCard';
import AppointmentRelatedList from '../components/appointment-detail/AppointmentRelatedList';
import AppointmentWorkflowCard from '../components/appointment-detail/AppointmentWorkflowCard';
import ConcludeAppointmentModal from '../components/appointment-detail/ConcludeAppointmentModal';
import LoadingState from '../components/appointment-detail/LoadingState';
import ErrorState from '../components/appointment-detail/ErrorState';
import useAppointmentDetailData from '../hooks/useAppointmentDetailData';
import useAppointmentDetailForm from '../hooks/useAppointmentDetailForm';
import RescheduleAppointmentModal from '../components/appointment-detail/RescheduleAppointmentModal';
import CancelAppointmentModal from '../components/appointment-detail/CancelAppointmentModal';
import useAuth from '../context/useAuth';

/* ================================
   Page component
================================ */
export default function AppointmentDetail() {
  const { appointmentId: appointmentIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const appointmentId = useMemo(() => {
    if (!appointmentIdParam) return null;

    const parsedId = Number(appointmentIdParam);
    return Number.isNaN(parsedId) ? null : parsedId;
  }, [appointmentIdParam]);

  const {
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
  } = useAppointmentDetailData(appointmentId);

  const canModifyAppointment = user?.role !== 'dentist'
    || Number(user.doctorId) === Number(appointment?.doctorId);
  const editableDoctors = user?.role === 'dentist'
    ? doctors.filter((doctor) => Number(doctor.id) === Number(user.doctorId))
    : doctors;

  const {
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
  } = useAppointmentDetailForm({
    appointmentId,
    appointment,
    setAppointment,
    isTerminalAppointment,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (pageError) {
    return <ErrorState message={pageError} />;
  }

  return (
    <div className="w-full space-y-6">
      <AppointmentDetailHeader
        isEditing={isEditing}
        isCompletedAppointment={isCompletedAppointment}
        isTerminalAppointment={isTerminalAppointment}
        navigate={navigate}
        location={location}
        onStartEdit={handleStartEdit}
        onStartReschedule={handleStartReschedule}
        onOpenConcludeModal={handleOpenConcludeModal}
        canModifyAppointment={canModifyAppointment}
      />

      {saveSuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveSuccess}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <AppointmentInfoSection
          appointment={appointment}
          patients={patients}
          doctors={editableDoctors}
          appointmentTypes={appointmentTypes}
          isEditing={isEditing}
          isCompletedAppointment={isCompletedAppointment}
          isSubmitting={isSubmitting}
          patientId={patientId}
          doctorId={doctorId}
          treatmentType={treatmentType}
          notes={notes}
          onPatientChange={setPatientId}
          onDoctorChange={setDoctorId}
          onTreatmentTypeChange={setTreatmentType}
          onNotesChange={setNotes}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
        />

        <div className="space-y-6">
          <AppointmentPatientCard appointment={appointment} />

          {!isCompletedAppointment ? (
            <AppointmentRelatedList relatedAppointments={relatedAppointments} />
          ) : null}

          <AppointmentWorkflowCard
            appointment={appointment}
            isCompletedAppointment={isCompletedAppointment}
            isTerminalAppointment={isTerminalAppointment}
            onStatusChange={handleStatusChange}
            onOpenCancelModal={handleOpenCancelModal}
            isSubmitting={isSubmitting}
            canModifyAppointment={canModifyAppointment}
          />
        </div>
      </div>

      <ConcludeAppointmentModal
        isOpen={isConcludeModalOpen}
        appointment={appointment}
        isSubmitting={isSubmitting}
        treatments={treatments}
        evidenceFiles={evidenceFiles}
        completionNotes={completionNotes}
        afterConcludeAction={afterConcludeAction}
        onTreatmentsChange={setTreatments}
        onEvidenceFilesChange={setEvidenceFiles}
        onCompletionNotesChange={setCompletionNotes}
        onAfterConcludeActionChange={setAfterConcludeAction}
        onClose={handleCloseConcludeModal}
        onSubmit={handleConcludeAppointment}
        appointmentTypes={appointmentTypes}
      />

      <RescheduleAppointmentModal
        key={`${appointment?.id || 'appointment'}-${isRescheduleModalOpen ? 'open' : 'closed'}`}
        isOpen={isRescheduleModalOpen}
        appointment={appointment}
        isFollowUp={isFollowUpReschedule}
        isSubmitting={isSubmitting}
        submitError={submitError}
        date={date}
        time={time}
        duration={duration}
        appointmentTypes={appointmentTypes}
        onDateChange={setDate}
        onTimeChange={setTime}
        onDurationChange={setDuration}
        onClose={handleCloseRescheduleModal}
        onSubmit={handleRescheduleAppointment}
      />

      <CancelAppointmentModal
        isOpen={isCancelModalOpen}
        appointment={appointment}
        isSubmitting={isSubmitting}
        onClose={handleCloseCancelModal}
        onConfirm={handleCancelAppointment}
      />
    </div>
  );
}
