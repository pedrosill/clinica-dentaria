import { useState } from 'react';
import RecallForm from '../components/recalls/RecallForm';
import RecallQueue from '../components/recalls/RecallQueue';
import useLanguage from '../context/useLanguage';
import useRecalls, { useRecallOptions } from '../hooks/useRecalls';

export default function Recalls() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('open');
  const { recalls, isLoading, error, isSubmitting, createRecall, transitionRecall } = useRecalls({ status });
  const { patients, isLoading: optionsLoading, error: optionsError } = useRecallOptions();

  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-sm font-medium text-teal-700">{t('Patient follow-up')}</p>
        <div className="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t('Recall queue')}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t('Keep patient follow-ups visible and easy to update.')}</p></div>
          <label className="space-y-2 text-sm font-medium text-slate-700">{t('Filter by status')}<select data-testid="recall-filter" value={status} onChange={(event) => setStatus(event.target.value)} className="block min-w-48 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="open">{t('Pending')}</option><option value="due">{t('Due')}</option><option value="scheduled">{t('Scheduled')}</option><option value="completed">{t('Completed')}</option><option value="dismissed">{t('Dismissed')}</option><option value="all">{t('All statuses')}</option></select></label>
        </div>
      </section>
      {error || optionsError ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error || optionsError}</div> : null}
      <RecallForm patients={patients} isSubmitting={isSubmitting || optionsLoading} onSubmit={createRecall} />
      <RecallQueue recalls={recalls} isLoading={isLoading} isSubmitting={isSubmitting} onTransition={transitionRecall} />
    </div>
  );
}
