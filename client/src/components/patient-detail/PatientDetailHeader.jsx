import { ChevronLeft, Pencil, Trash2, UserRound, X } from 'lucide-react';
import { getPatientDisplayName } from '../../utils/agendaUtils';

export default function PatientDetailHeader({
  patient,
  isEditing,
  isSubmitting,
  onBack,
  onStartEdit,
  onCancelEdit,
  onOpenDeleteModal,
}) {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={onOpenDeleteModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-300">
              <UserRound className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-teal-800">Patient file</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {getPatientDisplayName(patient)}
              </h1>
              <p className="text-sm text-slate-700">
                Operational patient details and appointment history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}