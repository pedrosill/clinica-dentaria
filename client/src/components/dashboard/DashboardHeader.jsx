/* ================================
   Imports
================================ */
import { Link } from 'react-router-dom';

/* ================================
   Component: dashboard header
================================ */
export default function DashboardHeader() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-teal-700">Clinic overview</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Review patients and upcoming appointments across the clinic.
          </p>
        </div>

        <Link
          to="/patients"
          className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
        >
          Open Patients
        </Link>
      </div>
    </section>
  );
}