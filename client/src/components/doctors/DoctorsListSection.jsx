import { Mail, Phone, Trash2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useLanguage from '../../context/useLanguage';

export default function DoctorsListSection({
  doctors,
  onOpenDeleteModal,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-300 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{t('Doctors')}</h2>
          <p className="text-sm text-slate-700">
            {t('All existing staff records. Double-click a card to open the doctor profile.')}
          </p>
        </div>

        <p className="text-sm font-medium text-slate-700">
          {doctors.length} {t(doctors.length === 1 ? 'result' : 'results')}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {doctors.length === 0 ? (
          <div className="border-t border-dashed border-slate-300 pt-6 text-center">
            <p className="text-sm font-medium text-slate-800">{t('No matching doctors found')}</p>
            <p className="mt-2 text-sm text-slate-600">
              {t('Try a different name, specialty, email or phone number.')}
            </p>
          </div>
        ) : (
          doctors.map((doctor) => (
            <div
              key={doctor.id}
              onDoubleClick={() => navigate(`/doctors/${doctor.id}`)}
              className="border-t border-slate-200 py-4 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-300">
                    <UserRound className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-semibold text-slate-950">{doctor.name}</p>

                    {doctor.specialty ? (
                      <p className="mt-1 text-sm font-medium text-slate-700">{doctor.specialty}</p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">{t('No specialty added.')}</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                      {doctor.email ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="h-4 w-4" />
                          {doctor.email}
                        </span>
                      ) : null}

                      {doctor.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="h-4 w-4" />
                          {doctor.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDeleteModal(doctor)}
                    className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('Delete')}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
