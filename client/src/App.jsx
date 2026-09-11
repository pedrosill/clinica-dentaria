/* ================================
   Imports
================================ */
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import AppointmentDetail from './pages/AppointmentDetail';
import PatientDetail from './pages/PatientDetail';
import DoctorDetail from './pages/DoctorDetail';
import Settings from './pages/Settings';

/* ================================
   Shared states
================================ */
function PlaceholderPage({ title, description }) {
  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-teal-700">Module</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center shadow-sm md:p-14">
        <p className="text-sm font-medium text-slate-700">{title} is under development</p>
        <p className="mt-2 text-sm text-slate-500">
          This area stays in the current shell and will follow the same UI patterns.
        </p>
      </section>
    </div>
  );
}

/* ================================
   App shell
================================ */
export default function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen w-full">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="w-full px-4 py-4 sm:px-6 sm:py-6 xl:px-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/appointments/:appointmentId" element={<AppointmentDetail />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/doctors/:doctorId" element={<DoctorDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/billing"
                element={
                  <PlaceholderPage
                    title="Billing"
                    description="Billing and invoices will appear here once that module is implemented."
                  />
                }
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
