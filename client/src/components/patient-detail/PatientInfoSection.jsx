import { getPatientDisplayName } from '../../utils/agendaUtils';
import useLanguage from '../../context/useLanguage';

export default function PatientInfoSection({
  patient,
  form,
  isEditing,
  isSubmitting,
  onChange,
  onSubmit,
  formatDisplayDate,
}) {
  const { t } = useLanguage();

  function handleFieldChange(event) {
    if (event.target.name === 'nationality') {
      const value = event.target.value;
      onChange({
        ...event,
        target: {
          ...event.target,
          value: value.trim().toLowerCase() === t('Portuguese').toLowerCase() || value.trim().toLowerCase() === 'portuguesa'
            ? 'Portuguese'
            : value,
        },
      });
      return;
    }
    onChange(event);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-950">{t('Patient information')}</h2>
      </div>

      {isEditing ? (
        <form onSubmit={onSubmit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2 md:col-span-2 xl:col-span-6">
            <label htmlFor="patient-full-name" className="text-sm font-medium text-slate-700">{t('Full name')}</label>
            <input
              type="text"
              name="fullName"
              id="patient-full-name"
              value={form.fullName}
              onChange={handleFieldChange}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <label htmlFor="patient-phone" className="text-sm font-medium text-slate-700">{t('Phone')}</label>
            <input
              type="text"
              name="phone"
              id="patient-phone"
              value={form.phone}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <label htmlFor="patient-email" className="text-sm font-medium text-slate-700">{t('Email')}</label>
            <input
              type="email"
              name="email"
              id="patient-email"
              value={form.email}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <label htmlFor="patient-nif" className="text-sm font-medium text-slate-700">{t('NIF')}</label>
            <input
              type="text"
              name="nif"
              id="patient-nif"
              value={form.nif}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <label htmlFor="patient-nationality" className="text-sm font-medium text-slate-700">{t('Nationality')}</label>
            <input
              type="text"
              name="nationality"
              id="patient-nationality"
              value={form.nationality.toLowerCase() === 'portuguese' ? t('Portuguese') : form.nationality}
              onChange={handleFieldChange}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <label htmlFor="patient-date-of-birth" className="text-sm font-medium text-slate-700">{t('Date of birth')}</label>
            <input
              type="date"
              name="dateOfBirth"
              id="patient-date-of-birth"
              value={form.dateOfBirth}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? t('Saving...') : t('Save patient')}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Full name')}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {getPatientDisplayName(patient)}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Phone')}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{patient.phone}</p>
          </div>

          <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Email')}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{patient.email}</p>
          </div>

          <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('NIF')}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{patient.nif}</p>
          </div>

          <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Nationality')}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{patient.nationality ? t(patient.nationality) : t('Not recorded')}</p>
          </div>

          <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Date of birth')}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {patient.dateOfBirth ? formatDisplayDate(patient.dateOfBirth) : t('Not recorded')}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Created')}</p>
            <p className="mt-2 text-base font-semibold text-slate-950">
              {formatDisplayDate(patient.createdAt)}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
