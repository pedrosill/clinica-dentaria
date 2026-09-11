/* ================================
   Imports
================================ */
import { Link } from 'react-router-dom';
import {
  getPatientDetailPath,
  getPatientDisplayName,
} from '../../utils/agendaUtils';
import { formatPatientCreatedDate } from '../../utils/dashboardUtils';

/* ================================
   Component: patient results table
================================ */
export default function DashboardPatientsTable({
  patients,
  searchTerm,
  onSearchChange,
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 md:px-8">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Patients</h2>
          <p className="text-sm text-slate-500">
            {patients.length} patient{patients.length === 1 ? '' : 's'} shown
          </p>
        </div>

        <div className="w-full max-w-md">
          <input
            type="text"
            placeholder="Search by name, phone, email or nationality"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-6 py-4 md:px-8">Patient</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4 md:px-8">Created</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {patients.length > 0 ? (
              patients.map((patient) => (
                <tr key={patient.id} className="align-top transition hover:bg-slate-50/80">
                  <td className="px-6 py-4 md:px-8">
                    <div className="min-w-0">
                      <Link
                        to={getPatientDetailPath(patient.id)}
                        className="truncate font-medium text-slate-900 hover:text-teal-700"
                      >
                        {getPatientDisplayName(patient)}
                      </Link>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-slate-600">{patient.phone || '—'}</td>

                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-100">
                      {patient.email || 'No email'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-500 md:px-8">
                    {formatPatientCreatedDate(patient.createdAt)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-14 md:px-8">
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                    <p className="text-sm font-medium text-slate-700">No patients found</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Try a different search term from the current list.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}