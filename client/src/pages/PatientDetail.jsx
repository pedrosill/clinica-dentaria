import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import PatientAppointmentsSection from '../components/patient-detail/PatientAppointmentsSection';
import PatientDetailHeader from '../components/patient-detail/PatientDetailHeader';
import PatientInfoSection from '../components/patient-detail/PatientInfoSection';
import usePatientDetailData from '../hooks/usePatientDetailData';
import usePatientDetailForm from '../hooks/usePatientDetailForm';
import {
  formatDisplayDate,
  getStatusClasses,
  getStatusLabel,
} from '../utils/patientDetailUtils';
import { getPatientDisplayName } from '../utils/agendaUtils';


export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const patientId = useMemo(() => {
    if (!id) return null;

    const parsedId = Number(id);
    return Number.isNaN(parsedId) ? null : parsedId;
  }, [id]);

  const {
    patient,
    setPatient,
    isLoading,
    pageError,
    upcomingAppointments,
    recentCompletedAppointments,
  } = usePatientDetailData(patientId);

  const {
    form,
    isEditing,
    isSubmitting,
    submitError,
    successMessage,
    isDeleteModalOpen,
    handleChange,
    handleStartEdit,
    handleCancelEdit,
    handleSavePatient,
    handleOpenDeleteModal,
    handleCloseDeleteModal,
    handleDeletePatient,
  } = usePatientDetailForm(patientId, patient, setPatient);

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/patients', { replace: true });
  }

  if (!patient && !isLoading) {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm md:p-8">
      <p className="text-sm font-medium text-red-700">Patient not found</p>
      <p className="mt-2 text-sm leading-6 text-red-600">
        The requested patient record could not be loaded.
      </p>
    </section>
  );
}

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-72 animate-pulse rounded-2xl bg-slate-100" />
        </section>

        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
        </section>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="w-full space-y-6">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            >
              Back
            </button>
          </div>
        </section>

        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {pageError}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <p className="text-sm font-medium text-slate-800">Patient not found</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PatientDetailHeader
        patient={patient}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onBack={handleBack}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onOpenDeleteModal={handleOpenDeleteModal}
      />

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {submitError}
        </div>
      ) : null}

      <PatientInfoSection
        patient={patient}
        form={form}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onChange={handleChange}
        onSubmit={handleSavePatient}
        formatDisplayDate={formatDisplayDate}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <PatientAppointmentsSection
          title="Upcoming appointments"
          description="Current and future appointments for this patient."
          emptyTitle="No upcoming appointments"
          emptyDescription="This patient does not have any upcoming bookings yet."
          appointments={upcomingAppointments}
          formatDisplayDate={formatDisplayDate}
          getStatusClasses={getStatusClasses}
          getStatusLabel={getStatusLabel}
        />

        <PatientAppointmentsSection
          title="Recent completed appointments"
          description="Latest completed work already recorded for this patient."
          emptyTitle="No completed appointments yet"
          emptyDescription="Completed treatment history will appear here once appointments are concluded."
          appointments={recentCompletedAppointments}
          formatDisplayDate={formatDisplayDate}
          getStatusClasses={getStatusClasses}
          getStatusLabel={getStatusLabel}
        />
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Confirm patient deletion"
        message={`Are you sure you want to delete patient: ${getPatientDisplayName(patient)}?`}
        isSubmitting={isSubmitting}
        onCancel={handleCloseDeleteModal}
        onConfirm={handleDeletePatient}
      />
    </div>
  );
}