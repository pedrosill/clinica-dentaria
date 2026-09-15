/* ================================
   Imports
================================ */
import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { getPatientDisplayName } from '../../utils/agendaUtils';
import useLanguage from '../../context/useLanguage';

/* ================================
   Component
================================ */
export default function AppointmentPatientCard({ appointment }) {
  const { t } = useLanguage();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <UserRound className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('Patient')}</h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {getPatientDisplayName(appointment.patient)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {appointment.patient?.phone || t('No phone number available')}
          </p>
        </div>

        <Link
          to={`/patients/${appointment.patientId}`}
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {t('Open patient record')}
        </Link>
      </div>
    </section>
  );
}
