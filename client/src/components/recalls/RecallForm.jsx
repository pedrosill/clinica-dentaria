import { useState } from 'react';
import useLanguage from '../../context/useLanguage';

function localDateInput() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function RecallForm({ patientId = null, patients = [], isSubmitting, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ dueDate: localDateInput(), reason: '', patientId: patientId || '' });
  const [formError, setFormError] = useState('');

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.patientId || !form.dueDate || !form.reason.trim()) {
      setFormError(t('Patient, due date and reason are required.'));
      return;
    }
    setFormError('');
    await onSubmit(form.patientId, { dueDate: form.dueDate, reason: form.reason.trim() });
    setForm((current) => ({ ...current, dueDate: localDateInput(), reason: '' }));
  }

  return (
    <form onSubmit={handleSubmit} data-testid="recall-create-form" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-950">{t('Create recall')}</h2>
        <p className="text-sm text-slate-600">{t('Record a date for the next patient follow-up.')}</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {patientId === null ? (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            {t('Patient')}
            <select data-testid="recall-patient" name="patientId" value={form.patientId} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800">
              <option value="">{t('Select patient')}</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}
            </select>
          </label>
        ) : <input type="hidden" name="patientId" value={patientId} />}
        <label className="space-y-2 text-sm font-medium text-slate-700">
          {t('Due date')}
          <input data-testid="recall-due-date" type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-1">
          {t('Reason')}
          <input data-testid="recall-reason" name="reason" value={form.reason} onChange={handleChange} maxLength={240} placeholder={t('e.g. Six-month check-up')} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800" />
        </label>
      </div>
      {formError ? <p className="mt-3 text-sm font-medium text-red-700">{formError}</p> : null}
      <button data-testid="recall-submit" type="submit" disabled={isSubmitting} className="mt-5 inline-flex rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70">
        {isSubmitting ? t('Saving…') : t('Create recall')}
      </button>
    </form>
  );
}
