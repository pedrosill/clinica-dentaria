/* ================================
   Imports
================================ */
import { ArrowRight, CalendarCheck2, Clock3, UserCheck2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useLanguage from '../../context/useLanguage';
import {
  formatDateInput,
  formatFullDate,
  getPatientDisplayName,
  getStatusClasses,
  getStatusLabel,
} from '../../utils/agendaUtils';
import { buildDashboardTodaySummary } from '../../utils/dashboardUtils';

/* ================================
   Component: today's operational summary
================================ */
export default function DashboardTodaySummary({ appointments }) {
  const { t } = useLanguage();
  const summary = buildDashboardTodaySummary(appointments);
  const today = new Date();
  const todayQuery = formatDateInput(today);

  return (
    <section className="rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
            <CalendarCheck2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('Today at a glance')}</h2>
            <p className="mt-1 text-sm capitalize text-slate-600">{formatFullDate(today)}</p>
          </div>
        </div>

        <Link
          to={`/agenda?date=${todayQuery}`}
          aria-label={t("Open today's agenda")}
          className="rounded-xl p-2 text-teal-700 transition hover:bg-teal-100 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <SummaryMetric
          icon={<CalendarCheck2 className="h-4 w-4" />}
          label={t('Appointments today')}
          value={summary.appointments.length}
        />
        <SummaryMetric
          icon={<Clock3 className="h-4 w-4" />}
          label={t('Open appointments')}
          value={summary.activeCount}
        />
        <SummaryMetric
          icon={<UserCheck2 className="h-4 w-4" />}
          label={t('Arrived patients')}
          value={summary.arrivedCount}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-white/80 bg-white/80 p-4">
        {summary.nextAppointment ? (
          <Link
            to={`/appointments/${summary.nextAppointment.id}`}
            className="group flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                {t('Next patient')}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-slate-900">
                {summary.nextAppointment.time} ·{' '}
                {summary.nextAppointment.patient
                  ? getPatientDisplayName(summary.nextAppointment.patient)
                  : t('Unknown patient')}
              </p>
              <p className="mt-1 truncate text-sm text-slate-600">
                {summary.nextAppointment.treatmentType || t('Consultation')}
              </p>
            </div>

            <span
              className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                summary.nextAppointment.status
              )}`}
            >
              {t(getStatusLabel(summary.nextAppointment.status))}
            </span>
          </Link>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {summary.appointments.length === 0
                ? t('No appointments scheduled today')
                : t('No active appointments remain today.')}
            </p>
          </div>
        )}
      </div>

      <Link
        to={`/agenda?date=${todayQuery}`}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 transition hover:text-teal-950"
      >
        {t("Open today's agenda")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function SummaryMetric({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-white/75 px-3 py-3">
      <div className="flex items-center gap-1.5 text-teal-700">{icon}</div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] font-medium leading-4 text-slate-600">{label}</p>
    </div>
  );
}
