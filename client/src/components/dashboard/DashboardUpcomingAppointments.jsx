/* ================================
   Imports
================================ */
import { ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import StateCard from '../StateCard';
import { formatFullDate, getPatientDisplayName } from '../../utils/agendaUtils';
import useLanguage from '../../context/useLanguage';

/* ================================
   Component: upcoming appointments
================================ */
export default function DashboardUpcomingAppointments({ appointments }) {
  const { t } = useLanguage();
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <CalendarDays className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t('Upcoming agenda')}</h2>
          <p className="text-sm text-slate-500">{t('Next scheduled appointments')}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <Link key={appointment.id} to={`/appointments/${appointment.id}`} className="group block border-t border-slate-200 py-4 first:border-t-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {appointment.patient
                      ? getPatientDisplayName(appointment.patient)
                      : t('Unknown patient')}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {appointment.treatmentType || t('Consultation')}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {formatFullDate(appointment.date)}
                  </p>
                </div>

                <span className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition group-hover:border-teal-200 group-hover:text-teal-800">
                  {appointment.time}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))
        ) : (
          <StateCard
            title={t('No upcoming appointments')}
            description={t('Future scheduled appointments will appear here.')}
            variant="empty"
          />
        )}
      </div>

      <Link
        to="/agenda"
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-teal-700 transition hover:text-teal-800"
      >
        {t('Open agenda')}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
