import { useState } from 'react';
import useLanguage from '../../context/useLanguage';
import SelectDropdown from '../ui/SelectDropdown';
import DatePicker from '../ui/DatePicker';

function localDateInput() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function WaitlistForm({ patientId = null, patients = [], doctors = [], isSubmitting, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ patientId: patientId || '', requestedDate: '', reason: '', priority: 'normal', notes: '', doctorId: '' });
  const [formError, setFormError] = useState('');

  function handleChange(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.patientId || !form.reason.trim()) { setFormError(t('Patient and reason are required.')); return; }
    setFormError('');
    await onSubmit(form.patientId, { requestedDate: form.requestedDate || null, reason: form.reason.trim(), priority: form.priority, notes: form.notes.trim() || null, doctorId: form.doctorId || null });
    setForm((current) => ({ ...current, requestedDate: '', reason: '', priority: 'normal', notes: '', doctorId: '' }));
  }

  return (
    <form onSubmit={handleSubmit} data-testid="waitlist-create-form" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-4"><h2 className="text-lg font-semibold text-slate-950">{t('Add to waitlist')}</h2><p className="text-sm text-slate-600">{t('Keep a short operational request for a future opening.')}</p></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {patientId === null ? <SelectDropdown label={t('Patient')} value={form.patientId} onChange={(value) => setForm((current) => ({ ...current, patientId: value }))} testId="waitlist-patient" options={[{ value: '', label: t('Select patient') }, ...patients.map((patient) => ({ value: String(patient.id), label: patient.fullName }))]} /> : <input type="hidden" name="patientId" value={patientId} />}
        <DatePicker label={t('Requested date')} value={form.requestedDate} onChange={(value) => setForm((current) => ({ ...current, requestedDate: value }))} min={localDateInput()} testId="waitlist-requested-date" clearable />
        <SelectDropdown label={t('Priority')} value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} options={[{ value: 'normal', label: t('Normal') }, { value: 'urgent', label: t('Urgent') }]} />
        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">{t('Reason')}<input data-testid="waitlist-reason" name="reason" value={form.reason} onChange={handleChange} maxLength={240} placeholder={t('e.g. Earlier appointment')} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm" /></label>
        <SelectDropdown label={t('Doctor (optional)')} value={form.doctorId} onChange={(value) => setForm((current) => ({ ...current, doctorId: value }))} options={[{ value: '', label: t('Any doctor') }, ...doctors.map((doctor) => ({ value: String(doctor.id), label: doctor.name }))]} />
        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-3">{t('Short notes')}<textarea name="notes" value={form.notes} onChange={handleChange} maxLength={500} rows="2" placeholder={t('Optional operational note')} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm" /></label>
      </div>
      {formError ? <p className="mt-3 text-sm font-medium text-red-700">{formError}</p> : null}
      <button data-testid="waitlist-submit" type="submit" disabled={isSubmitting} className="mt-5 inline-flex rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? t('Saving…') : t('Add to waitlist')}</button>
    </form>
  );
}
