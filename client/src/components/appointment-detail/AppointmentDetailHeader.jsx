/* ================================
   Imports
================================ */
import { ArrowLeft, CheckCircle2, Pencil } from 'lucide-react';
import useLanguage from '../../context/useLanguage';
import { getAppointmentReturnContext, getAppointmentReturnPath } from '../../utils/appointmentNavigation';

/* ================================
   Component
================================ */
export default function AppointmentDetailHeader({
  isEditing,
  isCompletedAppointment,
  isTerminalAppointment,
  navigate,
  location,
  onStartEdit,
  onStartReschedule,
  onOpenConcludeModal,
  canModifyAppointment = true,
}) {
  const { t } = useLanguage();
  const returnContext = getAppointmentReturnContext(location);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              if (location.key !== 'default') {
                navigate(-1);
                return;
              }

              navigate(getAppointmentReturnPath(location), { replace: true });
            }}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t(returnContext.labelKey)}
          </button>

          <div>
            <p className="text-sm font-medium text-teal-700">
              {isCompletedAppointment ? t('Completed appointment') : t('Appointment detail')}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              {t('Appointment')}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canModifyAppointment && !isEditing && !isTerminalAppointment ? (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              {t('Edit appointment')}
            </button>
          ) : null}

          {canModifyAppointment && !isTerminalAppointment ? (
            <button
              type="button"
              onClick={onStartReschedule}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {t('Reschedule')}
            </button>
          ) : null}

          {canModifyAppointment && !isTerminalAppointment ? (
            <button
              type="button"
              onClick={onOpenConcludeModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('Conclude Appointment')}
            </button>
          ) : null}
          {!canModifyAppointment ? (
            <p className="max-w-xs text-sm text-slate-500">
              {t('You can view this appointment, but only the assigned dentist can change it.')}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
