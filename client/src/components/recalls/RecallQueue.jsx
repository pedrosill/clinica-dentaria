import { Link } from 'react-router-dom';
import useLanguage from '../../context/useLanguage';
import { RECALL_TRANSITIONS } from '../../hooks/useRecalls';

function formatDueDate(value, locale) {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function statusLabel(status, t) {
  return t({ due: 'Due', scheduled: 'Scheduled', completed: 'Completed', dismissed: 'Dismissed' }[status] || status);
}

export default function RecallQueue({ recalls, isLoading, onTransition, isSubmitting }) {
  const { t, locale } = useLanguage();
  if (isLoading) return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="h-40 animate-pulse rounded-2xl bg-slate-100" /></section>;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-4"><h2 className="text-lg font-semibold text-slate-950">{t('Recall queue')}</h2><p className="text-sm text-slate-600">{t('Follow-up dates and their current status.')}</p></div>
      <div className="mt-5 space-y-3">
        {recalls.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><p className="text-sm font-medium text-slate-800">{t('No recalls found')}</p><p className="mt-2 text-sm text-slate-600">{t('There are no recalls for this filter.')}</p></div> : recalls.map((recall) => (
          <div key={recall.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <Link to={`/patients/${recall.patientId}`} className="text-base font-semibold text-teal-800 hover:text-teal-950">{recall.patient?.fullName || t('Unknown patient')}</Link>
                <p className="mt-1 text-sm text-slate-700">{recall.reason}</p>
                <p className="mt-2 text-xs font-medium text-slate-600">{t('Due date')}: {formatDueDate(recall.dueDate, locale)}{recall.doctor?.name ? ` · ${recall.doctor.name}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">{statusLabel(recall.status, t)}</span>
                {RECALL_TRANSITIONS[recall.status]?.length > 0 ? <select data-testid={`recall-status-${recall.id}`} aria-label={`${t('Update recall')} ${recall.patient?.fullName || ''}`} disabled={isSubmitting} defaultValue="" onChange={(event) => { if (event.target.value) onTransition(recall.id, event.target.value); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"><option value="">{t('Update')}</option>{RECALL_TRANSITIONS[recall.status].map((nextStatus) => <option key={nextStatus} value={nextStatus}>{statusLabel(nextStatus, t)}</option>)}</select> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
