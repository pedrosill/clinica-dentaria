export default function AgendaDayDetails({
  selectedDate,
  appointments,
  formatFullDate,
  getStatusClasses,
  getStatusLabel,
  renderCompactActions,
  onOpenCreateModal,
  onOpenAppointment,
}) {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-300 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{formatFullDate(selectedDate)}</h2>
          <p className="text-sm text-slate-700">
            {appointments.length} appointment{appointments.length === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
        >
          Add for this day
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              onDoubleClick={() => onOpenAppointment(appointment.id)}
              className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-50 p-4 transition hover:bg-slate-100/70"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <p className="text-base font-semibold text-slate-950">
                    {appointment.time} · {appointment.patient.firstName} {appointment.patient.lastName}
                  </p>
                  <p className="text-sm font-medium text-slate-700">{appointment.treatmentType}</p>
                  <p className="text-sm text-slate-600">{appointment.patient.phone}</p>
                </div>

                <div className="flex flex-col items-start gap-3 xl:items-end">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                      appointment.status
                    )}`}
                  >
                    {getStatusLabel(appointment.status)}
                  </span>

                  {renderCompactActions(appointment)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">No appointments for this day</p>
            <p className="mt-2 text-sm text-slate-600">
              Add a booking for this date to prepare the day ahead.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}