/* ================================
   Imports
================================ */
import { ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';

/* ================================
   Component
================================ */
export default function AppointmentDetailHeader({
  appointment,
  isEditing,
  isCompletedAppointment,
  navigate,
  location,
  onStartEdit,
  onStartReschedule,
  onOpenConcludeModal,
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (location.key !== 'default') {
                navigate(-1);
                return;
              }

              navigate('/patients', { replace: true });
            }}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to patients
          </button>

          <div>
            <p className="text-sm font-medium text-teal-700">
              {isCompletedAppointment ? 'Completed appointment' : 'Appointment detail'}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Appointment #{appointment.id}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {isCompletedAppointment
                ? 'Review the completed visit outcome and recorded notes.'
                : 'Review timing, treatment, completion outcome, and reschedule safely when needed.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {!isEditing && !isCompletedAppointment ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit appointment
            </button>
          ) : null}

          {!isCompletedAppointment ? (
            <button
              type="button"
              onClick={onStartReschedule}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Reschedule
            </button>
          ) : null}

          {!isCompletedAppointment ? (
            <button
              type="button"
              onClick={onOpenConcludeModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              Conclude Appointment
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}