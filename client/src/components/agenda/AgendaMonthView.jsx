import { getAppLocale } from '../../utils/agendaUtils';
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

      <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <div key={label} className="py-2">
            {t(label)}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-3">
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
                    {appointment.time} {appointment.patient.firstName}
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
    </section>
  );
}
