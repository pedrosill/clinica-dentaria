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
import Recalls from './pages/Recalls';
import Waitlist from './pages/Waitlist';
import Reports from './pages/Reports';
import Login from './pages/Login';
import AuthProvider from './context/AuthContext';
import LanguageProvider from './context/LanguageContext';
import useAuth from './context/useAuth';
import useLanguage from './context/useLanguage';

/* ================================
   Shared states
================================ */
/* ================================
   App shell
================================ */
function ProtectedRoutes() {
  const { isLoading, user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <p className="text-sm font-medium text-slate-600">{t('Loading clinic workspace…')}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <>
      <a className="skip-link" href="#main-content">{t('Skip to main content')}</a>
      <div className="min-h-screen bg-slate-200/70">
        <div className="flex min-h-screen w-full">
          <Sidebar />

          <main id="main-content" tabIndex="-1" className="min-w-0 flex-1 outline-none">
            <div className="w-full px-4 pb-4 pt-24 sm:px-6 sm:pb-6 sm:pt-24 xl:px-8 xl:py-6">
              <div key={`${location.pathname}${location.search}`} className="page-transition">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/appointments/:appointmentId" element={<AppointmentDetail />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route path="/doctors" element={<Doctors />} />
                  <Route path="/doctors/:doctorId" element={<DoctorDetail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/recalls" element={<Recalls />} />
                  <Route path="/waitlist" element={<Waitlist />} />
                  <Route path="/reports" element={<Reports />} />
                </Routes>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<ProtectedRoutes />} />
        </Routes>
      </LanguageProvider>
    </AuthProvider>
  );
}
