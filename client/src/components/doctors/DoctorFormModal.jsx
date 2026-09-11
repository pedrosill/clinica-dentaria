export default function DoctorFormModal({
  isOpen,
  editingDoctorId,
  form,
  submitError,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-800">
              {editingDoctorId ? 'Update staff record' : 'New doctor'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {editingDoctorId ? 'Edit Doctor' : 'Add Doctor'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {submitError ? (
          <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {submitError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-800">Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-slate-800">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Specialty</label>
              <input
                type="text"
                name="specialty"
                value={form.specialty}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-300 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? 'Saving...'
                : editingDoctorId
                  ? 'Save Changes'
                  : 'Create Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}