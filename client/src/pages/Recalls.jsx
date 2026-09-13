import { useState } from 'react';
import RecallForm from '../components/recalls/RecallForm';
import RecallQueue from '../components/recalls/RecallQueue';
import useLanguage from '../context/useLanguage';
import useRecalls, { useRecallOptions } from '../hooks/useRecalls';
import SelectDropdown from '../components/ui/SelectDropdown';

export default function Recalls() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('open');
  const { recalls, isLoading, error, isSubmitting, createRecall, transitionRecall } = useRecalls({ status });
  const { patients, isLoading: optionsLoading, error: optionsError } = useRecallOptions();

  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t('Recall queue')}</h1>
          <SelectDropdown
            label={t('Filter by status')}
            value={status}
            onChange={setStatus}
            testId="recall-filter"
            className="min-w-48"
            options={[
              { value: 'open', label: t('Pending') },
              { value: 'due', label: t('Due') },
              { value: 'scheduled', label: t('Scheduled') },
              { value: 'completed', label: t('Completed') },
              { value: 'dismissed', label: t('Dismissed') },
              { value: 'all', label: t('All statuses') },
            ]}
          />
        </div>
      </section>
      {error || optionsError ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error || optionsError}</div> : null}
      <RecallForm patients={patients} isSubmitting={isSubmitting || optionsLoading} onSubmit={createRecall} />
      <RecallQueue recalls={recalls} isLoading={isLoading} isSubmitting={isSubmitting} onTransition={transitionRecall} />
    </div>
  );
}
