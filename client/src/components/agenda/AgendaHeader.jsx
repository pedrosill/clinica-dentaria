import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import useLanguage from '../../context/useLanguage';

export default function AgendaHeader({
  viewType,
  onViewTypeChange,
  onCreateAppointment,
  onPreviousRange,
  onNextRange,
  onGoToToday,
}) {
  const { t } = useLanguage();
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-teal-800">{t('Secretary workflow')}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t('Agenda')}</h1>
          <p className="text-sm text-slate-700">
            {t("Review the week, prepare today's patients, and manage bookings.")}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateAppointment}
          data-testid="add-appointment"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
        >
          <Plus className="h-4 w-4" />
          {t('Add appointment')}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-slate-300 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewTypeChange('week')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              viewType === 'week'
                ? 'bg-teal-700 text-white'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            {t('Week')}
          </button>
          <button
            type="button"
            onClick={() => onViewTypeChange('month')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              viewType === 'month'
                ? 'bg-teal-700 text-white'
                : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
            }`}
          >
            {t('Month')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreviousRange}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onGoToToday}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
          >
            {t('Today')}
          </button>
          <button
            type="button"
            onClick={onNextRange}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
