import { Plus, Search } from 'lucide-react';
import useLanguage from '../../context/useLanguage';

export default function DoctorsHeader({
  searchTerm,
  onSearchChange,
  onOpenCreateModal,
  canManageDoctors = false,
}) {
  const { t } = useLanguage();
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-teal-800">{t('Secretary workflow')}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t('Doctors')}</h1>
          <p className="text-sm text-slate-700">
            {t('Search all doctors and manage clinical staff records.')}
          </p>
        </div>

        {canManageDoctors ? <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('Add doctor')}
        </button> : null}
      </div>

      <div className="mt-5 border-t border-slate-300 pt-5">
        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
            <Search className="h-4 w-4" />
          </span>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('Search all doctors by name, email, phone or specialty')}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
          />
        </label>
      </div>
    </section>
  );
}
