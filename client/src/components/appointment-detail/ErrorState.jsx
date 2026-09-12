/* ================================
   Imports
================================ */
import { Link } from 'react-router-dom';
import useLanguage from '../../context/useLanguage';

/* ================================
   Component
================================ */
export default function ErrorState({ message }) {
  const { t } = useLanguage();

  return (
    <section role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm md:p-8">
      <p className="text-sm font-medium text-red-700">{t('Unable to load appointment')}</p>
      <p className="mt-2 text-sm leading-6 text-red-600">{message}</p>
      <Link
        to="/agenda"
        className="mt-4 inline-flex items-center text-sm font-medium text-red-700 underline-offset-4 hover:underline"
      >
        {t('Back to Agenda')}
      </Link>
    </section>
  );
}
