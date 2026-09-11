import useLanguage from '../../context/useLanguage';

/* ================================
   Component: simple stat card
================================ */
export default function DashboardStatsCard({
  icon,
  title,
  description,
  value,
}) {
  const { t } = useLanguage();
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">{t(title)}</h2>
          <p className="text-sm text-slate-500">{t(description)}</p>
        </div>
      </div>

      <p className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </section>
  );
}
