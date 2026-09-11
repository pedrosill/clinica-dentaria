import useLanguage from '../../context/useLanguage';

/* ================================
   Component: error panel
================================ */
export default function DashboardErrorState({ message }) {
  const { t } = useLanguage();

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm md:p-8">
      <p className="text-sm font-medium text-red-700">{t('Unable to load dashboard')}</p>
      <p className="mt-2 text-sm leading-6 text-red-600">{message}</p>
    </section>
  );
}
