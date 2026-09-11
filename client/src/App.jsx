/* ================================
   Imports
================================ */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Patients from './pages/Patients';
import Doctors from './pages/Doctors';
import AppointmentDetail from './pages/AppointmentDetail';
import PatientDetail from './pages/PatientDetail';
import DoctorDetail from './pages/DoctorDetail';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AuthProvider from './context/AuthContext';
import useAuth from './context/useAuth';

/* ================================
   Shared states
================================ */
/* ================================
   App shell
================================ */
function ProtectedRoutes() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm font-medium text-slate-600">Loading clinic workspace…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-slate-200/70">
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
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  );
}
