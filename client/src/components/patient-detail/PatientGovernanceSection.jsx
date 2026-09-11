import { useEffect, useState } from 'react';
import useAuth from '../../context/useAuth';
import useLanguage from '../../context/useLanguage';
import {
  createPatientConsent,
  exportPatientRecord,
  getPatientConsents,
  withdrawPatientConsent,
} from '../../services/patients';

const EMPTY_FORM = { purpose: '', version: '1', signatureReference: '' };

function formatDate(value, locale) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

export default function PatientGovernanceSection({ patientId }) {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const canWrite = user?.role === 'admin' || user?.role === 'receptionist';
  const [consents, setConsents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    getPatientConsents(patientId)
      .then((data) => {
        if (isMounted) setConsents(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message || t('Unable to load consent records.'));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [patientId, t]);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const consent = await createPatientConsent(patientId, form);
      setConsents((current) => [consent, ...current]);
      setForm(EMPTY_FORM);
      setMessage(t('Consent recorded.'));
    } catch (submitError) {
      setError(submitError.message || t('Unable to record consent.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWithdraw(consentId) {
    if (!window.confirm(t('Withdraw this consent?'))) return;

    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const withdrawn = await withdrawPatientConsent(patientId, consentId);
      setConsents((current) => current.map((consent) => (
        consent.id === consentId ? withdrawn : consent
      )));
      setMessage(t('Consent withdrawn.'));
    } catch (withdrawError) {
      setError(withdrawError.message || t('Unable to withdraw consent.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExport() {
    setError('');
    setMessage('');
    setIsExporting(true);
    try {
      const payload = await exportPatientRecord(patientId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patient-${patientId}-record.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(t('Structured patient record downloaded.'));
    } catch (exportError) {
      setError(exportError.message || t('Unable to export the patient record.'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{t('Patient data governance')}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {t('Review consent history and export the structured patient record as JSON.')}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? t('Preparing export...') : t('Download JSON export')}
        </button>
      </div>

      {error ? <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p> : null}
      {message ? <p className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}

      {canWrite ? (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="consent-purpose" className="text-sm font-medium text-slate-700">{t('Purpose')}</label>
            <input id="consent-purpose" name="purpose" value={form.purpose} onChange={handleChange} required maxLength={160} placeholder={t('e.g. Treatment and care')} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label htmlFor="consent-version" className="text-sm font-medium text-slate-700">{t('Version')}</label>
            <input id="consent-version" name="version" value={form.version} onChange={handleChange} required maxLength={80} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label htmlFor="consent-signature" className="text-sm font-medium text-slate-700">{t('Signature reference')} <span className="font-normal text-slate-500">({t('optional')})</span></label>
            <input id="consent-signature" name="signatureReference" value={form.signatureReference} onChange={handleChange} maxLength={255} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:outline-none" />
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? t('Saving...') : t('Record consent')}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{t('Your role can view consent records and export this patient record, but cannot change consent.')}</p>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{t('Consent history')}</h3>
        {isLoading ? <p className="mt-3 text-sm text-slate-500">{t('Loading consent records...')}</p> : null}
        {!isLoading && consents.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t('No consent records have been recorded.')}</p> : null}
        <div className="mt-3 space-y-3">
          {consents.map((consent) => (
            <div key={consent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-900">{consent.purpose} <span className="font-normal text-slate-500">· v{consent.version}</span></p>
                <p className="mt-1 text-sm text-slate-600">{consent.status === 'withdrawn' ? t('Withdrawn') : t('Granted')} · {formatDate(consent.grantedAt, locale)}{consent.withdrawnAt ? ` · ${t('withdrawn')} ${formatDate(consent.withdrawnAt, locale)}` : ''}</p>
              </div>
              {canWrite && consent.status === 'granted' ? <button type="button" onClick={() => handleWithdraw(consent.id)} disabled={isSubmitting} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">{t('Withdraw')}</button> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
