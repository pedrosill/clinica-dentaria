/* ================================
   Imports
================================ */
import { useMemo } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import SelectDropdown from '../ui/SelectDropdown';
import { formatLongDate, getStatusClasses, getStatusLabel } from '../../utils/appointmentDetailUtils';
import {
  EMPTY_APPOINTMENT_TYPE_OPTION,
  getAppointmentTypeOptions,
} from '../../utils/appointmentTypeUtils';
import { getPatientDisplayName } from '../../utils/agendaUtils';
import useLanguage from '../../context/useLanguage';
import { downloadPatientDocument } from '../../services/patients';

/* ================================
   Component
================================ */
export default function AppointmentInfoSection({
  appointment,
  patients,
  doctors,
  appointmentTypes,
  isEditing,
  isCompletedAppointment,
  isSubmitting,
  patientId,
  doctorId,
  treatmentType,
  notes,
  onPatientChange,
  onDoctorChange,
  onTreatmentTypeChange,
  onNotesChange,
  onCancelEdit,
  onSave,
}) {
  const { t } = useLanguage();

  async function handleDownloadEvidence(document) {
    const blob = await downloadPatientDocument(appointment.patientId, document.id);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  const patientOptions = useMemo(
    () =>
      patients.map((patientOption) => ({
        value: String(patientOption.id),
        label: getPatientDisplayName(patientOption),
      })),
    [patients]
  );

  const doctorOptions = useMemo(
    () =>
      doctors.map((doctorOption) => ({
        value: String(doctorOption.id),
        label: doctorOption.name,
      })),
    [doctors]
  );

  const treatmentOptions = useMemo(
    () => {
      const options = getAppointmentTypeOptions(appointmentTypes, appointment?.treatmentType);
      return options.length > 0 ? options : [{
        ...EMPTY_APPOINTMENT_TYPE_OPTION,
        label: t(EMPTY_APPOINTMENT_TYPE_OPTION.label),
      }];
    },
    [appointment?.treatmentType, appointmentTypes, t]
  );

  return (
    <section className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <CalendarDays className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isCompletedAppointment ? t('Completion record') : t('Appointment information')}
          </h2>
          <p className="text-sm text-slate-500">
            {isCompletedAppointment
              ? t('Final outcome and clinical notes for this completed visit.')
              : t('Scheduling and follow-up use the same validated booking flow.')}
          </p>
        </div>
      </div>

      {!isEditing ? (
        isCompletedAppointment ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Date')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {formatLongDate(appointment.date)}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Status')}
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClasses(
                  appointment.status
                )}`}
              >
                {t(getStatusLabel(appointment.status))}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Performed treatment')}
              </p>
              {appointment.clinicalNote?.treatments?.length ? <ul className="mt-2 space-y-2">{appointment.clinicalNote.treatments.map((treatment) => <li key={treatment.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-900"><span className="font-medium">{treatment.procedureName}</span>{treatment.toothNumber ? <span className="ml-2 text-slate-600">· {t('Tooth')} {treatment.toothNumber}{treatment.surface ? ` · ${treatment.surface}` : ''}</span> : null}{treatment.notes ? <p className="mt-1 text-xs text-slate-600">{treatment.notes}</p> : null}</li>)}</ul> : <p className="mt-2 text-sm font-medium text-slate-900">{appointment.performedTreatment || t('Not recorded yet')}</p>}
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Completion note')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.completionNotes || t('No completion note recorded.')}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t('Visit evidence')}</p>
              {appointment.documents?.length ? <div className="mt-2 space-y-2">{appointment.documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><span className="truncate text-sm text-slate-700">{document.fileName}</span><button type="button" onClick={() => handleDownloadEvidence(document)} className="text-xs font-semibold text-teal-800 hover:underline">{t('Download')}</button></div>)}</div> : <p className="mt-2 text-sm text-slate-500">{t('No evidence attached to this visit.')}</p>}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Date')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {formatLongDate(appointment.date)}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Time')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{appointment.time}</p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Duration')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.duration || 30} {t('minutes')}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Status')}
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClasses(
                  appointment.status
                )}`}
              >
                {t(getStatusLabel(appointment.status))}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Scheduled treatment')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.treatmentType || t('Not recorded')}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Doctor')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.doctor?.name || t('No doctor assigned')}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Performed treatment')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.performedTreatment || t('Not recorded yet')}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Scheduling notes')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.notes || t('No scheduling notes recorded.')}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t('Completion note')}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.completionNotes || t('No completion note recorded.')}
              </p>
            </div>
          </div>
        )
      ) : (
        <form onSubmit={onSave} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            {t('Update the patient, doctor, treatment, or notes here. Use Reschedule to change the appointment date, time, or duration.')}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <SelectDropdown
                label={t('Patient')}
                value={patientId}
                onChange={onPatientChange}
                options={patientOptions}
                placeholder={t('Select a patient')}
                disabled={isSubmitting}
              />
            </div>

            <div className="lg:col-span-2">
              <SelectDropdown
                label={t('Doctor')}
                value={doctorId}
                onChange={onDoctorChange}
                options={doctorOptions}
                placeholder={t('Select a doctor')}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <SelectDropdown
                label={t('Scheduled treatment')}
                value={treatmentType}
                onChange={onTreatmentTypeChange}
                options={treatmentOptions}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">{t('Scheduling notes')}</label>
              <textarea
                rows="4"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t('Cancel')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? t('Saving...') : t('Save Changes')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
