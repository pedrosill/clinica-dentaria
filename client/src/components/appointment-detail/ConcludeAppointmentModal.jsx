/* ================================
   Imports
================================ */
import { useMemo } from 'react';
import { CheckCircle2, Paperclip, Plus, Trash2 } from 'lucide-react';
import Dialog from '../ui/Dialog';
import {
  EMPTY_APPOINTMENT_TYPE_OPTION,
  getAppointmentTypeOptions,
} from '../../utils/appointmentTypeUtils';
import useLanguage from '../../context/useLanguage';

/* ================================
   Component
================================ */
export default function ConcludeAppointmentModal({
  isOpen,
  appointment,
  appointmentTypes,
  isSubmitting,
  treatments = [],
  evidenceFiles = [],
  completionNotes,
  afterConcludeAction,
  onTreatmentsChange,
  onEvidenceFilesChange,
  onCompletionNotesChange,
  onAfterConcludeActionChange,
  onClose,
  onSubmit,
}) {
  const { t } = useLanguage();

  const treatmentOptions = useMemo(
    () => {
      const options = getAppointmentTypeOptions(
        appointmentTypes,
        appointment?.performedTreatment || appointment?.treatmentType
      );
      return options.length > 0 ? options : [{
        ...EMPTY_APPOINTMENT_TYPE_OPTION,
        label: t(EMPTY_APPOINTMENT_TYPE_OPTION.label),
      }];
    },
    [appointment, appointmentTypes, t]
  );

  if (!isOpen) return null;

  function updateTreatment(index, field, value) {
    onTreatmentsChange(treatments.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        isCloseDisabled={isSubmitting}
        labelledBy="conclude-appointment-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">{t('Doctor workflow')}</p>
            <h2 id="conclude-appointment-modal-title" className="mt-1 text-2xl font-semibold text-slate-900">
              {t('Conclude Appointment')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t('Record what was done, mark the appointment completed, and optionally continue to follow-up scheduling.')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            disabled={isSubmitting}
            aria-label={t('Close modal')}
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t('Scheduled treatment')}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {appointment.treatmentType || t('Not recorded')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">{t('Treatments performed')}</p>
              <button type="button" onClick={() => onTreatmentsChange([...treatments, { procedureName: '', toothNumber: '', surface: '', notes: '' }])} disabled={isSubmitting} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Plus className="h-3.5 w-3.5" />{t('Add treatment')}
              </button>
            </div>
            {treatments.map((treatment, index) => (
              <div key={`${index}-${treatment.procedureName}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_150px_auto] md:items-end">
                  <label className="space-y-1 text-xs font-semibold text-slate-600">
                    {t('Treatment')}
                    <input list={`performed-treatments-${index}`} value={treatment.procedureName || ''} onChange={(event) => updateTreatment(index, 'procedureName', event.target.value)} placeholder={t('Select an option')} required maxLength={200} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-teal-600 focus:outline-none" />
                    <datalist id={`performed-treatments-${index}`}>{treatmentOptions.map((option) => <option key={option.value} value={option.value} />)}</datalist>
                  </label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600">{t('Tooth')}<input value={treatment.toothNumber || ''} onChange={(event) => updateTreatment(index, 'toothNumber', event.target.value)} placeholder="ex. 16" maxLength={2} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-teal-600 focus:outline-none" /></label>
                  <label className="space-y-1 text-xs font-semibold text-slate-600">{t('Surface')}<select value={treatment.surface || ''} onChange={(event) => updateTreatment(index, 'surface', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800 focus:border-teal-600 focus:outline-none"><option value="">{t('Whole tooth / not specified')}</option><option value="mesial">{t('Mesial')}</option><option value="distal">{t('Distal')}</option><option value="occlusal">{t('Occlusal')}</option><option value="incisal">{t('Incisal')}</option><option value="buccal">{t('Buccal')}</option><option value="lingual">{t('Lingual')}</option><option value="palatal">{t('Palatal')}</option></select></label>
                  <button type="button" onClick={() => onTreatmentsChange(treatments.filter((_, itemIndex) => itemIndex !== index))} disabled={isSubmitting || treatments.length <= 1} aria-label={t('Remove treatment')} className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 px-3 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                </div>
                <textarea value={treatment.notes || ''} onChange={(event) => updateTreatment(index, 'notes', event.target.value)} rows="2" maxLength={1000} placeholder={t('Notes for this treatment (optional)')} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-600 focus:outline-none" />
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-teal-700" /><p className="text-sm font-medium text-slate-700">{t('Evidence for this visit')}</p></div>
            <p className="text-xs leading-5 text-slate-500">{t('Add photos, X-rays, or other files. They will be stored privately and linked to this appointment.')}</p>
            <label className="inline-flex w-fit cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              {t('Choose files')}
              <input type="file" multiple accept="application/pdf,image/jpeg,image/png,.docx" onChange={(event) => onEvidenceFilesChange([...evidenceFiles, ...Array.from(event.target.files || [])])} disabled={isSubmitting} className="sr-only" />
            </label>
            {evidenceFiles.length > 0 ? <ul className="space-y-1 text-xs text-slate-600">{evidenceFiles.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3"><span className="truncate">{file.name}</span><button type="button" onClick={() => onEvidenceFilesChange(evidenceFiles.filter((_, fileIndex) => fileIndex !== index))} disabled={isSubmitting} className="font-semibold text-red-700 hover:underline">{t('Remove')}</button></li>)}</ul> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t('Completion note')}</label>
            <textarea
              rows="4"
              value={completionNotes}
              onChange={(event) => onCompletionNotesChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              placeholder={t('Add a short completion note if needed')}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">{t('After conclusion')}</p>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="radio"
                name="afterConcludeAction"
                value="finish"
                checked={afterConcludeAction === 'finish'}
                onChange={(event) => onAfterConcludeActionChange(event.target.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">{t('Finish only')}</span>
                <span className="mt-1 block text-sm text-slate-500">
                  {t('Mark the appointment completed and stay on this page.')}
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="radio"
                name="afterConcludeAction"
                value="follow_up"
                checked={afterConcludeAction === 'follow_up'}
                onChange={(event) => onAfterConcludeActionChange(event.target.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  {t('Finish and continue to reschedule')}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {t('After conclusion, open the booking form immediately so a follow-up slot can be assigned.')}
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {t('Cancel')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? t('Saving...') : t('Complete Appointment')}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
