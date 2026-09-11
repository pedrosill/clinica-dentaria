/* ================================
   Imports
================================ */
import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import SelectDropdown from '../ui/SelectDropdown';
import Dialog from '../ui/Dialog';
import { TREATMENT_OPTIONS } from '../../utils/appointmentDetailUtils';

/* ================================
   Component
================================ */
export default function ConcludeAppointmentModal({
  isOpen,
  appointment,
  isSubmitting,
  performedTreatment,
  completionNotes,
  afterConcludeAction,
  onPerformedTreatmentChange,
  onCompletionNotesChange,
  onAfterConcludeActionChange,
  onClose,
  onSubmit,
}) {
  const treatmentOptions = useMemo(
    () =>
      TREATMENT_OPTIONS.map((option) => ({
        value: option,
        label: option,
      })),
    []
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        isCloseDisabled={isSubmitting}
        labelledBy="conclude-appointment-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">Doctor workflow</p>
            <h2 id="conclude-appointment-modal-title" className="mt-1 text-2xl font-semibold text-slate-900">
              Conclude Appointment
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Record what was done, mark the appointment completed, and optionally continue to
              follow-up scheduling.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Scheduled treatment
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {appointment.treatmentType || 'Consultation'}
            </p>
          </div>

          <div>
            <SelectDropdown
              label="Performed treatment"
              value={performedTreatment}
              onChange={onPerformedTreatmentChange}
              options={treatmentOptions}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Completion note</label>
            <textarea
              rows="4"
              value={completionNotes}
              onChange={(event) => onCompletionNotesChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              placeholder="Add a short completion note if needed"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">After conclusion</p>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="radio"
                name="afterConcludeAction"
                value="finish"
                checked={afterConcludeAction === 'finish'}
                onChange={(event) => onAfterConcludeActionChange(event.target.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Finish only</span>
                <span className="mt-1 block text-sm text-slate-500">
                  Mark the appointment completed and stay on this page.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="radio"
                name="afterConcludeAction"
                value="follow_up"
                checked={afterConcludeAction === 'follow_up'}
                onChange={(event) => onAfterConcludeActionChange(event.target.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Finish and continue to reschedule
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  After conclusion, open the booking form immediately so a follow-up slot can be
                  assigned.
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Complete Appointment'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
