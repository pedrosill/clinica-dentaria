/* ================================
   Imports
================================ */
import { CheckCircle2, FileText } from 'lucide-react';
import { getStatusClasses, getStatusLabel } from '../../utils/appointmentDetailUtils';

/* ================================
   Component
================================ */
export default function AppointmentWorkflowCard({
  appointment,
  isCompletedAppointment,
  onStartReschedule,
  onOpenConcludeModal,
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <FileText className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">Workflow actions</h2>
          <p className="text-sm text-slate-500">
            Conclude the visit or move directly into follow-up scheduling.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Current status
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClasses(
              appointment.status
            )}`}
          >
            {getStatusLabel(appointment.status)}
          </span>
        </div>

        {!isCompletedAppointment ? (
          <button
            type="button"
            onClick={onStartReschedule}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Reschedule appointment
          </button>
        ) : null}

        {!isCompletedAppointment ? (
          <button
            type="button"
            onClick={onOpenConcludeModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
          >
            <CheckCircle2 className="h-4 w-4" />
            Conclude Appointment
          </button>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            This appointment has already been concluded.
          </div>
        )}
      </div>
    </section>
  );
}