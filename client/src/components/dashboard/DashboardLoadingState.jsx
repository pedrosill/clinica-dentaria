/* ================================
   Component: loading skeleton
================================ */
export default function DashboardLoadingState() {
  return (
    <div className="w-full space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-9 w-56 animate-pulse rounded-2xl bg-slate-100" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-full bg-slate-100" />
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="h-[460px] animate-pulse rounded-3xl bg-slate-100" />
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-56 animate-pulse rounded-3xl bg-slate-100" />
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
          </section>
        </div>
      </div>
    </div>
  );
}
