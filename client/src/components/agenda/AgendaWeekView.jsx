import { getAppLocale, getPatientDisplayName } from '../../utils/agendaUtils';
import useLanguage from '../../context/useLanguage';

export default function AgendaWeekView({
  weekLabel,
  weekDays,
  selectedDate,
  appointments,
  isSameDay,
  getAppointmentDateTime,
  getStatusClasses,
  getStatusLabel,
  onSelectDate,
  onOpenAppointment,
  showDoctor = false,
}) {
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 border-b border-slate-300 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{weekLabel}</h2>
          <p className="text-sm text-slate-700">
            {t('Select a day or open an appointment.')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-7">
        {weekDays.map((day) => {
          const dayAppointments = appointments
            .filter((appointment) => isSameDay(appointment.date, day))
            .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second));

          return (
            <div
              key={day.toISOString()}
              className={`border-t border-slate-200 p-4 transition first:border-t-0 xl:border-l xl:border-t-0 xl:pl-4 ${
                isSameDay(day, selectedDate)
                  ? 'border-teal-600 bg-teal-50 shadow-inner ring-1 ring-inset ring-teal-200'
                  : isSameDay(day, new Date())
                    ? 'border-teal-300 bg-teal-50/60'
                    : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectDate(day)}
                className={`w-full rounded-xl px-2 py-2 text-left transition ${
                  isSameDay(day, selectedDate)
                    ? 'text-teal-950 hover:bg-teal-100/60'
                    : ''
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                    isSameDay(day, selectedDate) ? 'text-teal-800' : 'text-slate-600'
                  }`}
                >
                  {new Intl.DateTimeFormat(getAppLocale(), { weekday: 'short' }).format(day)}
                </p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    isSameDay(day, selectedDate) ? 'text-teal-950' : 'text-slate-950'
                  }`}
                >
                  {new Intl.DateTimeFormat(getAppLocale(), { day: '2-digit' }).format(day)}
                </p>
              </button>

              <div className="mt-4 space-y-3">
                {dayAppointments.length > 0 ? (
                  dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-950">
                            {appointment.time} · {getPatientDisplayName(appointment.patient)}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{appointment.treatmentType}</p>
                          {showDoctor ? <p className="mt-1 text-xs font-medium text-slate-600">{t('Doctor')}: {appointment.doctor?.name || t('Not recorded')}</p> : null}
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${getStatusClasses(
                            appointment.status
                          )}`}
                        >
                          {t(getStatusLabel(appointment.status))}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenAppointment(appointment.id)}
                        className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                      >
                        {t('Open appointment')}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="border-t border-dashed border-slate-300 pt-4 text-center">
                    <p className="text-sm font-medium text-slate-700">{t('No appointments')}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
