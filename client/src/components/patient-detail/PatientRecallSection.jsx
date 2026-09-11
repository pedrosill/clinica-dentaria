import RecallForm from '../recalls/RecallForm';
import RecallQueue from '../recalls/RecallQueue';
import useLanguage from '../../context/useLanguage';
import useRecalls from '../../hooks/useRecalls';

export default function PatientRecallSection({ patientId }) {
  const { t } = useLanguage();
  const { recalls, isLoading, error, isSubmitting, createRecall, transitionRecall } = useRecalls({ patientId, status: 'all', limit: 50 });
  return (
    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold text-slate-950">{t('Recall history')}</h2><p className="text-sm text-slate-600">{t('Compact history of this patient’s follow-ups.')}</p></div>
      {error ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
      <RecallForm patientId={patientId} isSubmitting={isSubmitting} onSubmit={createRecall} />
      <RecallQueue recalls={recalls} isLoading={isLoading} isSubmitting={isSubmitting} onTransition={transitionRecall} />
    </section>
  );
}
