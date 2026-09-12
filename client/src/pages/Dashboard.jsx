/* ================================
   Imports
================================ */
import { Users } from 'lucide-react';
import DashboardErrorState from '../components/dashboard/DashboardErrorState';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardLoadingState from '../components/dashboard/DashboardLoadingState';
import DashboardPatientsTable from '../components/dashboard/DashboardPatientsTable';
import DashboardStatsCard from '../components/dashboard/DashboardStatsCard';
import DashboardTodaySummary from '../components/dashboard/DashboardTodaySummary';
import DashboardUpcomingAppointments from '../components/dashboard/DashboardUpcomingAppointments';
import DashboardWorkQueue from '../components/dashboard/DashboardWorkQueue';
import useDashboardData from '../hooks/useDashboardData';
import useLanguage from '../context/useLanguage';

/* ================================
   Page: dashboard
   Keep this page intentionally thin.
   Fetching, search logic, and data
   shaping live in hooks and utils.
================================ */
export default function Dashboard() {
  const { t } = useLanguage();
  const {
    patients,
    searchTerm,
    setSearchTerm,
    isLoading,
    pageError,
    filteredPatients,
    upcomingAppointments,
    todayAppointments,
    workQueue,
    workQueueLoading,
    workQueueError,
    refreshWorkQueue,
  } = useDashboardData();

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (pageError) {
    return <DashboardErrorState message={pageError} />;
  }

  return (
    <div className="w-full space-y-6">
      <DashboardHeader />

      {workQueueLoading ? <div className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white" aria-label={t('Loading work queue')} /> : null}
      {!workQueueLoading && workQueueError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{workQueueError}</div> : null}
      {!workQueueLoading && workQueue ? <DashboardWorkQueue data={workQueue} onRefresh={refreshWorkQueue} /> : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <DashboardPatientsTable
          patients={filteredPatients}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <div className="space-y-6">
          <DashboardTodaySummary appointments={todayAppointments} />

          <DashboardUpcomingAppointments appointments={upcomingAppointments} />

          <DashboardStatsCard
            icon={<Users className="h-5 w-5" />}
            title={t('Patient count')}
            description={t('Current registered patients')}
            value={patients.length}
          />
        </div>
      </div>
    </div>
  );
}
