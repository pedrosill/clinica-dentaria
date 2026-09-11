import { CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import useLanguage from '../../context/useLanguage';

export default function PatientAppointmentsSection({
  title,
  description,
  emptyTitle,
  emptyDescription,
  appointments,
  formatDisplayDate,
  getStatusClasses,
  getStatusLabel,
}) {
  const { t, locale } = useLanguage();

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-300 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-700">{description}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {appointments.length === 0 ? (
          <div className="border-t border-dashed border-slate-300 pt-6 text-center">
            <p className="text-sm font-medium text-slate-800">{emptyTitle}</p>
            <p className="mt-2 text-sm text-slate-600">{emptyDescription}</p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div key={appointment.id} className="border-t border-slate-200 py-4 first:border-t-0">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-950">
                    {formatDisplayDate(appointment.date, locale)} · {appointment.time}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {appointment.treatmentType}
                  </p>
                  {appointment.notes ? (
                    <p className="mt-2 text-sm text-slate-600">{appointment.notes}</p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">{t('No notes added.')}</p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-3 xl:items-end">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                      appointment.status
                    )}`}
                  >
                    {t(getStatusLabel(appointment.status))}
                  </span>

                  <Link
                    to={`/appointments/${appointment.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {t('Open appointment')}
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
