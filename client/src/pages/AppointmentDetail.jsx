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

/* ================================
   Page component
================================ */
export default function AppointmentDetail() {
  const { appointmentId: appointmentIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  const {
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
    handleStatusChange,
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
        appointment={appointment}
        isEditing={isEditing}
        isCompletedAppointment={isCompletedAppointment}
        isTerminalAppointment={isTerminalAppointment}
        navigate={navigate}
        location={location}
        onStartEdit={handleStartEdit}
        onStartReschedule={handleStartReschedule}
        onOpenConcludeModal={handleOpenConcludeModal}
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
          doctors={doctors}
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
            onStartReschedule={handleStartReschedule}
            onOpenConcludeModal={handleOpenConcludeModal}
            onStatusChange={handleStatusChange}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      <ConcludeAppointmentModal
        isOpen={isConcludeModalOpen}
        appointment={appointment}
        isSubmitting={isSubmitting}
        performedTreatment={performedTreatment}
        completionNotes={completionNotes}
        afterConcludeAction={afterConcludeAction}
        onPerformedTreatmentChange={setPerformedTreatment}
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
    </div>
  );
}
