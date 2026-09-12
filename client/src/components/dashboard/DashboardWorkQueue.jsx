import { AlertCircle, ArrowRight, CheckCircle2, Clock3, ListChecks, RefreshCw, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import useLanguage from '../../context/useLanguage';
import { formatQueueDueAt, getWorkQueuePresentation } from '../../utils/workQueueUtils';
import { createAppointmentReturnState } from '../../utils/appointmentNavigation';

const priorityStyles = {
  urgent: 'border-rose-200 bg-rose-50 text-rose-800',
  high: 'border-amber-200 bg-amber-50 text-amber-800',
  normal: 'border-slate-200 bg-slate-50 text-slate-700',
};
const EMPTY_ITEMS = [];

export default function DashboardWorkQueue({ data, onRefresh }) {
  const { t } = useLanguage();
  const location = useLocation();
  const items = data?.items || EMPTY_ITEMS;
  const counts = data?.counts || {};
  const [filter, setFilter] = useState('all');
  const today = new Date();
  const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const filteredItems = useMemo(() => items.filter((item) => {
    if (filter === 'urgent') return item.priority === 'urgent';
    if (filter === 'today') return String(item.dueAt || '').startsWith(todayValue);
    return true;
  }), [filter, items, todayValue]);
  const recommendedItem = items[0] || null;
  const recommendedPresentation = recommendedItem ? getWorkQueuePresentation(recommendedItem, t) : null;

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

      {recommendedItem && recommendedPresentation ? (
        <Link to={recommendedItem.action.path} state={recommendedItem.appointmentId ? createAppointmentReturnState(location, 'Back to dashboard') : undefined} className="mt-5 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-900 transition hover:border-teal-300 hover:bg-teal-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
          <Sparkles className="h-5 w-5 shrink-0 text-teal-700" />
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{t('Recommended next step')}</p><p className="mt-1 truncate font-semibold">{recommendedPresentation.title}</p><p className="mt-1 truncate text-sm text-teal-800">{t('Use the highest-priority item first to keep the clinic moving.')}</p></div>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t('Work queue filters')}>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>{t('All actions')}</FilterButton>
        <FilterButton active={filter === 'urgent'} onClick={() => setFilter('urgent')}>{t('Urgent only')}</FilterButton>
        <FilterButton active={filter === 'today'} onClick={() => setFilter('today')}>{t('Due today')}</FilterButton>
      </div>

      <div className="mt-5 space-y-2">
        {filteredItems.length ? filteredItems.slice(0, 8).map((item) => {
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
        }) : items.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-600">{t('No actions match this filter')}</div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div><p className="font-semibold">{t('Nothing needs attention')}</p><p className="mt-1 text-sm">{t('The clinic’s current operational items are on track.')}</p></div>
          </div>
        )}
      </div>
      {filteredItems.length > 8 ? <p className="mt-4 text-xs text-slate-500">{t('Showing the 8 most important actions first.')}</p> : null}
    </section>
  );
}

function FilterButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{children}</button>;
}

function QueueMetric({ label, value, tone }) {
  const styles = tone === 'urgent' ? 'bg-rose-50 text-rose-800' : tone === 'arrived' ? 'bg-sky-50 text-sky-800' : 'bg-slate-50 text-slate-700';
  return <div className={`rounded-2xl px-3 py-3 ${styles}`}><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs font-medium">{label}</p></div>;
}
