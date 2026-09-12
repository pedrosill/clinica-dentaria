import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import PatientAppointmentsSection from '../components/patient-detail/PatientAppointmentsSection';
import ClinicalRecordSection from '../components/patient-detail/ClinicalRecordSection';
import PatientDetailHeader from '../components/patient-detail/PatientDetailHeader';
import PatientInfoSection from '../components/patient-detail/PatientInfoSection';
import PatientGovernanceSection from '../components/patient-detail/PatientGovernanceSection';
import PatientRecallSection from '../components/patient-detail/PatientRecallSection';
import PatientWaitlistSection from '../components/patient-detail/PatientWaitlistSection';
import AnimatedDisclosure from '../components/ui/AnimatedDisclosure';
import usePatientDetailData from '../hooks/usePatientDetailData';
import usePatientDetailForm from '../hooks/usePatientDetailForm';
import {
  formatDisplayDate,
  getStatusClasses,
  getStatusLabel,
} from '../utils/patientDetailUtils';
import { getPatientDisplayName } from '../utils/agendaUtils';
import useLanguage from '../context/useLanguage';
import useAuth from '../context/useAuth';

function PatientToolToggle({ title, description, isOpen, onToggle }) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-white px-5 py-4 text-left transition hover:border-teal-400 hover:bg-teal-50/30"
    >
      <span>
        <span className="block text-base font-semibold text-slate-950">{t(title)}</span>
        <span className="mt-1 block text-sm text-slate-600">{t(description)}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-teal-800">
        {isOpen ? t('Close section') : t('Open section')}
        <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </span>
    </button>
  );
}

function PatientTab({ title, isActive, onClick }) {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
    >
      {t(title)}
    </button>
  );
}


export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const canEditPatient = user?.role === 'admin' || user?.role === 'receptionist';
  const [activeTab, setActiveTab] = useState('overview');
  const [openPatientTool, setOpenPatientTool] = useState(null);

  const patientId = useMemo(() => {
    if (!id) return null;

    const parsedId = Number(id);
    return Number.isNaN(parsedId) ? null : parsedId;
  }, [id]);

  const {
    patient,
    setPatient,
    clinicalRecord,
    setClinicalRecord,
    appointments,
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
      <p className="text-sm font-medium text-red-700">{t('Patient not found')}</p>
      <p className="mt-2 text-sm leading-6 text-red-600">
        {t('The requested patient record could not be loaded.')}
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
              {t('Back')}
            </button>
          </div>
        </section>

        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {pageError}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
        <p className="text-sm font-medium text-slate-800">{t('Patient not found')}</p>
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
        canEditPatient={canEditPatient}
        onStartEdit={handleStartEdit}
        onCancelEdit={handleCancelEdit}
        onOpenDeleteModal={handleOpenDeleteModal}
      />

      {successMessage ? (
        <div role="status" aria-live="polite" className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
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

      <nav className="flex flex-wrap gap-2 border-b border-slate-300 pb-3" role="tablist" aria-label={t('Patient areas')}>
        <PatientTab title="Overview" isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <PatientTab title="Clinical record" isActive={activeTab === 'clinical'} onClick={() => setActiveTab('clinical')} />
        <PatientTab title="Operations" isActive={activeTab === 'operations'} onClick={() => setActiveTab('operations')} />
      </nav>

      {activeTab === 'clinical' ? (
        <div className="content-transition">
          <ClinicalRecordSection
            patientId={patientId}
            appointments={appointments}
            clinicalRecord={clinicalRecord}
            setClinicalRecord={setClinicalRecord}
          />
        </div>
      ) : null}

      {activeTab === 'operations' ? (
        <div className="content-transition space-y-3">
          <PatientToolToggle
            title="Patient data governance"
            description="Review consent history and export the structured patient record as JSON."
            isOpen={openPatientTool === 'governance'}
            onToggle={() => setOpenPatientTool((current) => (current === 'governance' ? null : 'governance'))}
          />
          <AnimatedDisclosure open={openPatientTool === 'governance'}>
            <PatientGovernanceSection patientId={patientId} />
          </AnimatedDisclosure>

          <PatientToolToggle
            title="Recall history"
            description="Compact history of this patient’s follow-ups."
            isOpen={openPatientTool === 'recall'}
            onToggle={() => setOpenPatientTool((current) => (current === 'recall' ? null : 'recall'))}
          />
          <AnimatedDisclosure open={openPatientTool === 'recall'}>
            <PatientRecallSection patientId={patientId} />
          </AnimatedDisclosure>

          <PatientToolToggle
            title="Waitlist history"
            description="Compact history of this patient’s waitlist requests."
            isOpen={openPatientTool === 'waitlist'}
            onToggle={() => setOpenPatientTool((current) => (current === 'waitlist' ? null : 'waitlist'))}
          />
          <AnimatedDisclosure open={openPatientTool === 'waitlist'}>
            <PatientWaitlistSection patientId={patientId} />
          </AnimatedDisclosure>
        </div>
      ) : null}

      {activeTab === 'overview' ? (
        <div className="content-transition grid gap-6 xl:grid-cols-2">
          <PatientAppointmentsSection
            title={t('Upcoming appointments')}
            description={t('Current and future appointments for this patient.')}
            emptyTitle={t('No upcoming appointments')}
            emptyDescription={t('This patient does not have any upcoming bookings yet.')}
            appointments={upcomingAppointments}
            formatDisplayDate={formatDisplayDate}
            getStatusClasses={getStatusClasses}
            getStatusLabel={getStatusLabel}
          />

          <PatientAppointmentsSection
            title={t('Recent completed appointments')}
            description={t('Latest completed work already recorded for this patient.')}
            emptyTitle={t('No completed appointments yet')}
            emptyDescription={t('Completed treatment history will appear here once appointments are concluded.')}
            appointments={recentCompletedAppointments}
            formatDisplayDate={formatDisplayDate}
            getStatusClasses={getStatusClasses}
            getStatusLabel={getStatusLabel}
          />
        </div>
      ) : null}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title={t('Confirm patient deletion')}
        message={`${t('Are you sure you want to delete patient')}: ${getPatientDisplayName(patient)}?`}
        isSubmitting={isSubmitting}
        onCancel={handleCloseDeleteModal}
        onConfirm={handleDeletePatient}
      />
    </div>
  );
}
