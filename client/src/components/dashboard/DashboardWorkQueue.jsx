import { AlertCircle, ArrowRight, CheckCircle2, Clock3, ListChecks, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useLanguage from '../../context/useLanguage';
import { formatQueueDueAt, getWorkQueuePresentation } from '../../utils/workQueueUtils';
import { createAppointmentReturnState } from '../../utils/appointmentNavigation';

const priorityStyles = {
  urgent: 'border-rose-200 bg-rose-50 text-rose-800',
  high: 'border-amber-200 bg-amber-50 text-amber-800',
  normal: 'border-slate-200 bg-slate-50 text-slate-700',
};

export default function DashboardWorkQueue({ data, onRefresh }) {
  const { t } = useLanguage();
  const location = useLocation();
  const items = data?.items || [];
  const counts = data?.counts || {};

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-labelledby="work-queue-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <h2 id="work-queue-heading" className="text-xl font-semibold text-slate-900">{t('Needs attention')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('The next actions calculated from today’s clinic data.')}</p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
          <RefreshCw className="h-4 w-4" />{t('Refresh')}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QueueMetric label={t('Attention')} value={counts.attention || 0} />
        <QueueMetric label={t('Urgent')} value={counts.urgent || 0} tone="urgent" />
        <QueueMetric label={t('Today')} value={counts.today || 0} />
        <QueueMetric label={t('Arrived')} value={counts.arrived || 0} tone="arrived" />
      </div>

      <div className="mt-5 space-y-2">
        {items.length ? items.slice(0, 8).map((item) => {
          const presentation = getWorkQueuePresentation(item, t);
          const linkState = item.appointmentId ? createAppointmentReturnState(location, 'Back to dashboard') : undefined;
          return (
            <Link key={item.id} to={item.action.path} state={linkState} className={`group flex items-start gap-3 rounded-2xl border p-3 transition hover:-translate-y-px hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${priorityStyles[item.priority] || priorityStyles.normal}`}>
              <div className="mt-0.5 shrink-0">{item.priority === 'urgent' ? <AlertCircle className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{presentation.title}</p>
                <p className="mt-1 text-sm opacity-80">{presentation.reason}</p>
                {item.dueAt ? <p className="mt-1 text-xs opacity-70">{t('Due')} · {formatQueueDueAt(item.dueAt, document.documentElement.lang === 'pt-PT' ? 'pt-PT' : 'en-GB')}</p> : null}
              </div>
              <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-semibold"><span className="hidden sm:inline">{presentation.actionLabel}</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          );
        }) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div><p className="font-semibold">{t('Nothing needs attention')}</p><p className="mt-1 text-sm">{t('The clinic’s current operational items are on track.')}</p></div>
          </div>
        )}
      </div>
      {items.length > 8 ? <p className="mt-4 text-xs text-slate-500">{t('Showing the 8 most important actions first.')}</p> : null}
    </section>
  );
}

function QueueMetric({ label, value, tone }) {
  const styles = tone === 'urgent' ? 'bg-rose-50 text-rose-800' : tone === 'arrived' ? 'bg-sky-50 text-sky-800' : 'bg-slate-50 text-slate-700';
  return <div className={`rounded-2xl px-3 py-3 ${styles}`}><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs font-medium">{label}</p></div>;
}
