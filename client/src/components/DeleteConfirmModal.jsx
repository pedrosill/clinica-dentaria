import { AlertTriangle, Trash2, X } from 'lucide-react';
import Dialog from './ui/Dialog';
import useLanguage from '../context/useLanguage';

export default function DeleteConfirmModal({
  isOpen,
  title = 'Confirm deletion',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  onCancel,
  onConfirm,
}) {
  const { t } = useLanguage();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Dialog
        isOpen={isOpen}
        onClose={onCancel}
        isCloseDisabled={isSubmitting}
        labelledBy="delete-confirm-modal-title"
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-700">{t('Delete action')}</p>
            <h2 id="delete-confirm-modal-title" className="mt-1 text-xl font-semibold text-slate-900">
              {t(title)}
            </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label={t('Close modal')}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {t(cancelLabel)}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Trash2 className="h-4 w-4" />
            {isSubmitting ? t('Deleting...') : t(confirmLabel)}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

