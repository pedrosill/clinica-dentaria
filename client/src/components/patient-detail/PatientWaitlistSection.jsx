import WaitlistForm from '../waitlist/WaitlistForm';
import WaitlistQueue from '../waitlist/WaitlistQueue';
import useLanguage from '../../context/useLanguage';
import useWaitlist from '../../hooks/useWaitlist';

export default function PatientWaitlistSection({ patientId }) {
  const { t } = useLanguage();
  const { entries, isLoading, error, isSubmitting, createEntry, transitionEntry } = useWaitlist({ patientId, status: 'all', limit: 50 });
  return <section className="space-y-4"><div><h2 className="text-xl font-semibold text-slate-950">{t('Waitlist history')}</h2><p className="text-sm text-slate-600">{t('Compact history of this patient’s waitlist requests.')}</p></div>{error ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}<WaitlistForm patientId={patientId} isSubmitting={isSubmitting} onSubmit={createEntry} /><WaitlistQueue entries={entries} isLoading={isLoading} isSubmitting={isSubmitting} onTransition={transitionEntry} /></section>;
}
