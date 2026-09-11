/* ================================
   Imports
================================ */
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Search, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPatient } from '../services/patients';
import { getPatientDisplayName } from '../utils/agendaUtils';
import useLanguage from '../context/useLanguage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/* ================================
   Helpers
================================ */
function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function isSameDay(firstDate, secondDate) {
  const first = new Date(firstDate);
  const second = new Date(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatFullDate(date, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function getAppointmentDateTime(appointment) {
  const d = new Date(appointment.date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T${appointment.time}:00`);
}

/* ================================
   Page component
================================ */
export default function Patients() {
  const navigate = useNavigate();
  const { t, locale } = useLanguage();

  /* ================================
     State: page data
  ================================ */
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('today');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createNif, setCreateNif] = useState('');
  const [createNationality, setCreateNationality] = useState('Portuguese');
  const [createSubmitError, setCreateSubmitError] = useState('');
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);

  /* ================================
     Effects: load page data
  ================================ */
  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      try {
        setIsLoading(true);
        setPageError('');

        const [patientsResponse, appointmentsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/patients`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/api/appointments`, { credentials: 'include' }),
        ]);

        if (!patientsResponse.ok || !appointmentsResponse.ok) {
          throw new Error('Failed to load patient workflow data');
        }

        const [patientsData, appointmentsData] = await Promise.all([
          patientsResponse.json(),
          appointmentsResponse.json(),
        ]);

        if (!isMounted) return;

        setPatients(patientsData);
        setAppointments(appointmentsData);
      } catch (error) {
        if (!isMounted) return;
        setPageError(error.message || 'Failed to load patient workflow data');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ================================
     Derived state: patients
  ================================ */
  const today = startOfDay(new Date());

  const todayAppointments = useMemo(() => {
    const seenPatientIds = new Set();

    return appointments
      .filter((appointment) => {
        if (!isSameDay(new Date(appointment.date), new Date())) {
          return false;
        }

        if (!appointment.patient?.id) {
          return true;
        }

        if (seenPatientIds.has(appointment.patient.id)) {
          return false;
        }

        seenPatientIds.add(appointment.patient.id);
        return true;
      })
      .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second));
  }, [appointments]);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return patients;
    }

    return patients.filter((patient) => {
      const fullName = getPatientDisplayName(patient).toLowerCase();
      const phone = String(patient.phone || '').toLowerCase();
      const email = String(patient.email || '').toLowerCase();
      const nif = String(patient.nif || '').toLowerCase();

      return (
        fullName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        nif.includes(normalizedSearch)
      );
    });
  }, [patients, searchTerm]);

  /* ================================
     Handlers: create patient modal
  ================================ */
  function handleOpenCreateModal() {
    setCreateFullName('');
    setCreatePhone('');
    setCreateEmail('');
    setCreateNif('');
    setCreateNationality('Portuguese');
    setCreateSubmitError('');
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isCreateSubmitting) return;
    setIsCreateModalOpen(false);
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();

    if (
      !createFullName.trim() ||
      !createPhone.trim() ||
      !createEmail.trim() ||
      !createNif.trim() ||
      !createNationality.trim()
    ) {
      setCreateSubmitError(t('Full name, phone, email, NIF and nationality are required'));
      return;
    }

    if (createNationality.trim().toLowerCase() === 'portuguese' && !/^\d{9}$/.test(createNif.trim())) {
      setCreateSubmitError(t('Portuguese NIF must contain exactly 9 digits'));
      return;
    }

    try {
      setIsCreateSubmitting(true);
      setCreateSubmitError('');

      const newPatient = await createPatient({
        fullName: createFullName.trim(),
        phone: createPhone.trim(),
        email: createEmail.trim().toLowerCase(),
        nif: createNif.trim(),
        nationality: createNationality.trim(),
      });

      setPatients((current) => [newPatient, ...current]);
      setIsCreateModalOpen(false);
    } catch (error) {
      setCreateSubmitError(error.message || 'Failed to create patient');
    } finally {
      setIsCreateSubmitting(false);
    }
  }

  /* ================================
   Render helpers: patient navigation
================================ */
  function getPatientDetailPath(patientId) {
    const normalizedId = Number(patientId);

    return Number.isNaN(normalizedId) ? '/patients' : `/patients/${normalizedId}`;
  }

  /* ================================
     Loading state
  ================================ */
  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-80 animate-pulse rounded-2xl bg-slate-100" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-80 animate-pulse rounded-3xl bg-slate-100" />
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ================================
         Render: page header
      ================================ */}
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-teal-800">{t('Secretary workflow')}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t('Patients')}</h1>
            <p className="text-sm text-slate-700">
              {t('Search all patients and work from today&apos;s active appointment list.')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('Add patient')}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-300 pt-5" role="tablist" aria-label={t('Patient views')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'today'}
            onClick={() => setActiveView('today')}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeView === 'today' ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            {t('Patients today')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'search'}
            onClick={() => setActiveView('search')}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeView === 'search' ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            <Search className="mr-2 h-4 w-4" />
            {t('Search patients')}
          </button>
        </div>

        {activeView === 'search' ? (
          <div className="mt-4">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setActiveView('search');
                  setSearchTerm(event.target.value);
                }}
                placeholder={t('Search all patients by name, phone, email or NIF')}
                autoFocus
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-500 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </label>
          </div>
        ) : null}
      </section>

      {pageError ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {pageError}
        </div>
      ) : null}

      {/* ================================
         Render: search results
      ================================ */}
      {activeView === 'search' ? (
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-300 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{t('Search results')}</h2>
              <p className="text-sm text-slate-700">{t('All existing patients')}</p>
            </div>

            <p className="text-sm font-medium text-slate-700">
              {filteredPatients.length} {t(filteredPatients.length === 1 ? 'result' : 'results')}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {!searchTerm.trim() ? (
              <div className="border-t border-dashed border-slate-300 pt-6 text-center">
                <p className="text-sm font-medium text-slate-800">{t('Search by patient details')}</p>
                <p className="mt-2 text-sm text-slate-600">{t('Enter a name, phone, email or NIF to find a patient.')}</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <p className="text-sm font-medium text-slate-800">{t('No matching patients found')}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {t('Try a different name, phone, email or NIF.')}
                </p>
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  onDoubleClick={() => navigate(getPatientDetailPath(patient.id))}
                  className="rounded-2xl border border-slate-300 bg-slate-50 p-4 transition hover:bg-slate-100/70"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-300">
                        <UserRound className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-950">
                          {getPatientDisplayName(patient)}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">{patient.phone}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {patient.nationality || '—'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={getPatientDetailPath(patient.id)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                      <UserRound className="mr-2 h-4 w-4" />
                      {t('Open patient')}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      {/* ================================
         Render: todays patient list
      ================================ */}
      {activeView === 'today' ? <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-300 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t('Patients with appointments today')}
            </h2>
            <p className="text-sm text-slate-700">{formatFullDate(today, locale)}</p>
          </div>

          <p className="text-sm font-medium text-slate-700">
            {todayAppointments.length} {t(todayAppointments.length === 1 ? 'result' : 'results')}
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {todayAppointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">{t('No patients scheduled for today')}</p>
              <p className="mt-2 text-sm text-slate-600">
                {t('Today&apos;s operational patient list will appear here once appointments exist.')}
              </p>
            </div>
          ) : (
            todayAppointments.map((appointment) => (
              <div
                key={appointment.id}
                onDoubleClick={() => navigate(getPatientDetailPath(appointment.patientId))}
                className="rounded-2xl border border-slate-300 bg-slate-50 p-4 transition hover:bg-slate-100/70"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-300">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">
                        {getPatientDisplayName(appointment.patient)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {appointment.patient.phone}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {appointment.time} · {appointment.treatmentType}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/appointments/${appointment.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {t('Appointment')}
                    </Link>

                    <Link
                      to={getPatientDetailPath(appointment.patientId)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
                    >
                      <UserRound className="mr-2 h-4 w-4" />
                      {t('Patient')}
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section> : null}

      {/* ================================
         Render: create patient modal
      ================================ */}
      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-teal-800">{t('New patient')}</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">{t('Add Patient')}</h2>
              </div>

              <button
                type="button"
                onClick={handleCloseCreateModal}
                disabled={isCreateSubmitting}
                className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
              >
                ×
              </button>
            </div>

            {createSubmitError ? (
              <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {createSubmitError}
              </div>
            ) : null}

            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium text-slate-800">{t('Full name')}</label>
                  <input
                    type="text"
                    value={createFullName}
                    onChange={(event) => setCreateFullName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">{t('Phone')}</label>
                  <input
                    type="text"
                    value={createPhone}
                    onChange={(event) => setCreatePhone(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">{t('Email')}</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(event) => setCreateEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">{t('Nationality')}</label>
                  <input
                    type="text"
                    value={createNationality}
                    onChange={(event) => setCreateNationality(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">{t('NIF')}</label>
                  <input
                    type="text"
                    value={createNif}
                    onChange={(event) => setCreateNif(event.target.value)}
                    pattern={createNationality.trim().toLowerCase() === 'portuguese' ? '[0-9]{9}' : undefined}
                    inputMode={createNationality.trim().toLowerCase() === 'portuguese' ? 'numeric' : 'text'}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-300 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isCreateSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {t('Cancel')}
                </button>

                <button
                  type="submit"
                  disabled={isCreateSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreateSubmitting ? t('Saving...') : t('Create Patient')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
