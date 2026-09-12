import { getAppLocale, getPatientDisplayName } from '../../utils/agendaUtils';
import useLanguage from '../../context/useLanguage';

export default function AgendaMonthView({
  currentMonth,
  monthDays,
  selectedDate,
  appointments,
  isSameDay,
  isSameMonth,
  onSelectDay,
  onOpenWeek,
  showDoctor = false,
}) {
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-300 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            {new Intl.DateTimeFormat(getAppLocale(), {
              month: 'long',
              year: 'numeric',
            }).format(currentMonth)}
          </h2>
          <p className="text-sm text-slate-700">
            {t('Single click selects a day. Use Open week to open the week view.')}
          </p>
        </div>
      </div>

      <div className="hidden grid-cols-7 gap-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 sm:grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <div key={label} className="py-2">
            {t(label)}
          </div>
        ))}
      </div>

      <div className="mt-3 hidden grid-cols-7 gap-3 sm:grid">
        {monthDays.map((day) => {
          const dayAppointments = appointments.filter((appointment) =>
            isSameDay(appointment.date, day)
          );
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`min-h-28 border p-3 text-left transition ${
                isSameDay(day, selectedDate)
                  ? 'border-teal-600 bg-teal-50 shadow-inner ring-1 ring-inset ring-teal-200'
                  : isCurrentMonth
                    ? 'border-slate-300 bg-white hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDay(day);
                  }}
                  aria-label={`${t('Select')} ${new Intl.DateTimeFormat(getAppLocale(), {
                    dateStyle: 'full',
                  }).format(day)}`}
                  className={`rounded-lg px-1 py-0.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1 ${
                    isSameDay(day, selectedDate)
                      ? 'text-teal-950'
                      : isCurrentMonth
                        ? 'text-slate-950'
                        : 'text-slate-500'
                  }`}
                >
                  {day.getDate()}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenWeek(day);
                  }}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1"
                >
                  {t('Open week')}
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {dayAppointments.slice(0, 2).map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`rounded-lg px-2 py-1 text-xs font-medium ${
                      isSameDay(day, selectedDate)
                        ? 'bg-teal-200 text-teal-950'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="block">{appointment.time} · {getPatientDisplayName(appointment.patient)}</span>
                    {showDoctor ? <span className="mt-0.5 block text-[11px] font-normal">{appointment.doctor?.name || t('Not recorded')}</span> : null}
                  </div>
                ))}

                {dayAppointments.length > 2 ? (
                  <div
                    className={`text-xs font-medium ${
                      isSameDay(day, selectedDate) ? 'text-teal-900' : 'text-slate-700'
                    }`}
                  >
                    {dayAppointments.length - 2} {t('more')}
                  </div>
                ) : null}

              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:hidden">
        {monthDays.filter((day) => isSameMonth(day, currentMonth)).map((day) => {
          const dayAppointments = appointments.filter((appointment) => isSameDay(appointment.date, day));
          const isSelected = isSameDay(day, selectedDate);
          const dayLabel = new Intl.DateTimeFormat(getAppLocale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(day);

          return (
            <div key={day.toISOString()} className={`rounded-2xl border p-3 ${isSelected ? 'border-teal-600 bg-teal-50 ring-1 ring-inset ring-teal-200' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-label={`${t('Select')} ${new Intl.DateTimeFormat(getAppLocale(), { dateStyle: 'full' }).format(day)}`}
                  className="text-left focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  <span className="block text-sm font-semibold text-slate-950">{dayLabel}</span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {dayAppointments.length} {t(dayAppointments.length === 1 ? 'appointment' : 'appointments')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWeek(day)}
                  className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1"
                >
                  {t('Open week')}
                </button>
              </div>

              {dayAppointments.length > 0 ? (
                <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-800">
                      <span className="block">{appointment.time} · {getPatientDisplayName(appointment.patient)}</span>
                      {showDoctor ? <span className="mt-0.5 block text-[11px] font-normal">{appointment.doctor?.name || t('Not recorded')}</span> : null}
                    </div>
                  ))}
                  {dayAppointments.length > 3 ? <p className="text-xs font-medium text-slate-600">{dayAppointments.length - 3} {t('more')}</p> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
