import { useState } from 'react';
import WaitlistForm from '../components/waitlist/WaitlistForm';
import WaitlistQueue from '../components/waitlist/WaitlistQueue';
import useLanguage from '../context/useLanguage';
import useWaitlist, { useWaitlistOptions } from '../hooks/useWaitlist';

export default function Waitlist() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('active');
  const { entries, isLoading, error, isSubmitting, createEntry, transitionEntry } = useWaitlist({ status });
  const { patients, doctors, isLoading: optionsLoading, error: optionsError } = useWaitlistOptions();
  return <div className="w-full space-y-6"><section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><p className="text-sm font-medium text-teal-700">{t('Operational scheduling')}</p><div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t('Waitlist')}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t('Keep patients visible when they are looking for an earlier or future opening.')}</p></div><label className="space-y-2 text-sm font-medium text-slate-700">{t('Filter by status')}<select data-testid="waitlist-filter" value={status} onChange={(event) => setStatus(event.target.value)} className="block min-w-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="active">{t('Waiting and contacted')}</option><option value="waiting">{t('Waiting')}</option><option value="contacted">{t('Contacted')}</option><option value="all">{t('All statuses')}</option></select></label></div></section>{error || optionsError ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error || optionsError}</div> : null}<WaitlistForm patients={patients} doctors={doctors} isSubmitting={isSubmitting || optionsLoading} onSubmit={createEntry} /><WaitlistQueue entries={entries} isLoading={isLoading} isSubmitting={isSubmitting} onTransition={transitionEntry} /></div>;
}
