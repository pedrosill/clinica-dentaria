import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import useLanguage from '../context/useLanguage';
import useReportsData from '../hooks/useReportsData';
import SelectDropdown from '../components/ui/SelectDropdown';
import DatePicker from '../components/ui/DatePicker';
import {
  addLocalDays,
  downloadAppointmentReportCsv,
  formatLocalDate,
  formatReportDate,
  REPORT_STATUS_OPTIONS,
} from '../utils/reportUtils';

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

function MetricCard({ label, value, description }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </section>
  );
}

export default function Reports() {
  const { t, locale } = useLanguage();
  const initialFilters = useMemo(() => {
    const from = formatLocalDate();
    return { from, to: addLocalDays(from, 30), doctorId: '', status: '' };
  }, []);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [filterError, setFilterError] = useState('');
  const { doctors, report, isLoading, pageError } = useReportsData(appliedFilters);
  const byStatus = report.summary?.byStatus || {};

  function applyFilters(event) {
    event.preventDefault();
    if (!draftFilters.from || !draftFilters.to || draftFilters.from > draftFilters.to) {
      setFilterError(t('Choose a valid inclusive date range.'));
      return;
    }
    setFilterError('');
    setAppliedFilters({ ...draftFilters });
  }

  function exportCsv() {
    if (report.rows.length === 0) return;
    downloadAppointmentReportCsv(report.rows);
  }

  return (
    <div className="w-full space-y-6" data-testid="reports-page">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-900">
              <BarChart3 className="h-7 w-7 text-teal-700" />
              {t('Reports')}
            </h1>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={isLoading || report.rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="reports-export"
          >
            <Download className="h-4 w-4" />
            {t('Export visible CSV')}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto] xl:items-end" onSubmit={applyFilters}>
          <DatePicker label={t('From')} value={draftFilters.from} onChange={(value) => setDraftFilters((current) => ({ ...current, from: value }))} testId="reports-from" />
          <DatePicker label={t('To')} value={draftFilters.to} onChange={(value) => setDraftFilters((current) => ({ ...current, to: value }))} testId="reports-to" />
          <SelectDropdown
            label={t('Doctor')}
            value={draftFilters.doctorId}
            onChange={(value) => setDraftFilters((current) => ({ ...current, doctorId: value }))}
            testId="reports-doctor"
            options={[
              { value: '', label: t('All doctors') },
              ...doctors.map((doctor) => ({ value: String(doctor.id), label: doctor.name })),
            ]}
          />
          <SelectDropdown
            label={t('Status')}
            value={draftFilters.status}
            onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))}
            testId="reports-status"
            options={[
              { value: '', label: t('All statuses') },
              ...REPORT_STATUS_OPTIONS.map((status) => ({ value: status, label: t(STATUS_LABELS[status]) })),
            ]}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800"
            data-testid="reports-apply"
          >
            <RefreshCw className="h-4 w-4" />
            {t('Apply filters')}
          </button>
        </form>
        {filterError ? <p className="mt-3 text-sm font-medium text-red-700" role="alert">{filterError}</p> : null}
        <p className="mt-3 text-xs text-slate-500">{t('Dates are inclusive. The report is limited to 200 rows.')}</p>
      </section>

      {pageError ? (
        <section className="rounded-2xl border border-red-300 bg-red-50 px-4 py-4 text-sm font-medium text-red-800" role="alert">
          {pageError}
        </section>
      ) : null}

      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-4" aria-label={t('Loading reports')}>
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-100" />)}
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4" aria-label={t('Report totals')}>
            <MetricCard label={t('Total appointments')} value={report.summary?.total || 0} description={t('Matching the selected filters')} />
            <MetricCard label={t('Scheduled')} value={byStatus.scheduled || 0} description={t('Appointments scheduled')} />
            <MetricCard label={t('Completed')} value={byStatus.completed || 0} description={t('Appointments completed')} />
            <MetricCard label={t('No-shows')} value={byStatus.no_show || 0} description={t('Appointments marked as no-show')} />
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{t('Appointment rows')}</h2>
                <p className="mt-1 text-sm text-slate-500">{formatReportDate(report.from || appliedFilters.from, locale)} {t('to')} {formatReportDate(report.to || appliedFilters.to, locale)}</p>
              </div>
              {report.hasMore ? <p className="text-xs font-medium text-amber-700">{t('Showing the first 200 matching rows.')}</p> : null}
            </div>
            {report.rows.length === 0 ? (
              <div className="px-5 py-12 text-center" data-testid="reports-empty">
                <p className="text-sm font-semibold text-slate-800">{t('No appointments match these filters.')}</p>
                <p className="mt-1 text-sm text-slate-500">{t('Try a wider period or a different status.')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto" data-testid="reports-table">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{t('Date')}</th>
                      <th className="px-5 py-3 font-semibold">{t('Time')}</th>
                      <th className="px-5 py-3 font-semibold">{t('Duration')}</th>
                      <th className="px-5 py-3 font-semibold">{t('Treatment type')}</th>
                      <th className="px-5 py-3 font-semibold">{t('Status')}</th>
                      <th className="px-5 py-3 font-semibold">{t('Doctor')}</th>
                      <th className="px-5 py-3 font-semibold">{t('Patient')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-700">{formatReportDate(row.date, locale)}</td>
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-900">{row.time}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-700">{row.duration} {t('min')}</td>
                        <td className="px-5 py-3 text-slate-700">{row.treatmentType || t('—')}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-700">{t(STATUS_LABELS[row.status] || row.status)}</td>
                        <td className="px-5 py-3 text-slate-700">{row.doctor?.name || t('Unknown doctor')}</td>
                        <td className="px-5 py-3 text-slate-700">{row.patient?.name || t('Unknown patient')} <span className="text-xs text-slate-400">(#{row.patient?.id})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
