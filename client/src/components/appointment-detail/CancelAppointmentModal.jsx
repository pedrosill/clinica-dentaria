import { AlertTriangle } from 'lucide-react';
import Dialog from '../ui/Dialog';
import useLanguage from '../../context/useLanguage';

export default function CancelAppointmentModal({
  isOpen,
  appointment,
  isSubmitting,
  onClose,
  onConfirm,
}) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        isCloseDisabled={isSubmitting}
        labelledBy="cancel-appointment-modal-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl md:p-8"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-rose-700">{t('Cancel appointment')}</p>
            <h2 id="cancel-appointment-modal-title" className="mt-1 text-xl font-semibold text-slate-900">
              {t('Cancel this appointment?')}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          {t('This will close the booking and remove it from active agenda and upcoming views.')}
          {appointment?.patient ? ` ${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() : ''}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {t('Keep appointment')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? t('Cancelling…') : t('Cancel booking')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
