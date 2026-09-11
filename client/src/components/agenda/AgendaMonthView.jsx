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
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between border-b border-slate-300 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            {new Intl.DateTimeFormat('en-GB', {
              month: 'long',
              year: 'numeric',
            }).format(currentMonth)}
          </h2>
          <p className="text-sm text-slate-700">
            Single click selects a day. Double-click opens week view.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <div key={label} className="py-2">
            {label}
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
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              onDoubleClick={() => onOpenWeek(day)}
              className={`min-h-28 rounded-2xl border p-3 text-left transition ${
                isSameDay(day, selectedDate)
                  ? 'border-teal-600 bg-teal-50 shadow-inner ring-1 ring-inset ring-teal-200'
                  : isCurrentMonth
                    ? 'border-slate-300 bg-white hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  isSameDay(day, selectedDate)
                    ? 'text-teal-950'
                    : isCurrentMonth
                      ? 'text-slate-950'
                      : 'text-slate-500'
                }`}
              >
                {day.getDate()}
              </p>

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
                    {dayAppointments.length - 2} more
                  </div>
                ) : null}

                {isSameDay(day, selectedDate) ? (
                  <div className="pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-800">
                    Double-click to open week
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}