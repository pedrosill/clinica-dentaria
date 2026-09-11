/* ================================
   Imports
================================ */
import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import { formatShortDate } from '../../utils/appointmentDetailUtils';
import useLanguage from '../../context/useLanguage';

/* ================================
   Component
================================ */
export default function AppointmentRelatedList({ relatedAppointments }) {
  const { t } = useLanguage();
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <Clock3 className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('Related appointments')}</h2>
          <p className="text-sm text-slate-500">{t('Recent appointments for this patient')}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {relatedAppointments.length > 0 ? (
          relatedAppointments.map((relatedAppointment) => (
            <Link
              key={relatedAppointment.id}
              to={`/appointments/${relatedAppointment.id}`}
              className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
            >
              <p className="text-sm font-medium text-slate-900">
                {formatShortDate(relatedAppointment.date)} · {relatedAppointment.time}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {relatedAppointment.treatmentType}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">{t('No other appointments found')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
