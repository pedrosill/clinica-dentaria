import { useState } from 'react';
import SelectDropdown from '../components/ui/SelectDropdown';
import useAuth from '../context/useAuth';
import WaitlistForm from '../components/waitlist/WaitlistForm';
import WaitlistQueue from '../components/waitlist/WaitlistQueue';
import useLanguage from '../context/useLanguage';
import useWaitlist, { useWaitlistOptions } from '../hooks/useWaitlist';

export default function Waitlist() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [status, setStatus] = useState('active');
  const { entries, isLoading, error, isSubmitting, createEntry, transitionEntry } = useWaitlist({ status });
  const { patients, doctors, isLoading: optionsLoading, error: optionsError } = useWaitlistOptions();
  const selectableDoctors = user?.role === 'dentist'
    ? doctors.filter((doctor) => Number(doctor.id) === Number(user.doctorId))
    : doctors;
  return <div className="w-full space-y-6"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t('Waitlist')}</h1><SelectDropdown label={t('Filter by status')} value={status} onChange={setStatus} testId="waitlist-filter" className="min-w-48" options={[{ value: 'active', label: t('Waiting and contacted') }, { value: 'waiting', label: t('Waiting') }, { value: 'contacted', label: t('Contacted') }, { value: 'all', label: t('All statuses') }]} /></div></section>{error || optionsError ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error || optionsError}</div> : null}<WaitlistForm patients={patients} doctors={selectableDoctors} isSubmitting={isSubmitting || optionsLoading} onSubmit={createEntry} /><WaitlistQueue entries={entries} isLoading={isLoading} isSubmitting={isSubmitting} onTransition={transitionEntry} /></div>;
}
