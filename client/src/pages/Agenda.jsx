import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useLanguage from '../context/useLanguage';
import useAuth from '../context/useAuth';
import AgendaHeader from '../components/agenda/AgendaHeader';
import AgendaWeekView from '../components/agenda/AgendaWeekView';
import AgendaMonthView from '../components/agenda/AgendaMonthView';
import AgendaDayDetails from '../components/agenda/AgendaDayDetails';
import AppointmentModal from '../components/agenda/AppointmentModal';
import useAgendaData from '../hooks/useAgendaData';
import useAppointmentForm from '../hooks/useAppointmentForm';
import {
  addDays,
  formatCalendarMonth,
  formatFullDate,
  formatWeekRange,
  getAppointmentDateTime,
  getMonthDays,
  getPatientDetailPath,
  getStatusClasses,
  getStatusLabel,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfWeek,
} from '../utils/agendaUtils';

export default function Agenda() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isDentist = user?.role === 'dentist';
  const [viewType, setViewType] = useState('week');
  const initialAgendaDate = useMemo(() => {
    const dateParam = new URLSearchParams(location.search).get('date');

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam || '')) {
      return startOfDay(new Date(`${dateParam}T00:00:00`));
    }

    return startOfDay(new Date());
  }, [location.search]);
  const [selectedDate, setSelectedDate] = useState(initialAgendaDate);
  const [currentMonth, setCurrentMonth] = useState(initialAgendaDate);
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => (
    isDentist && user?.doctorId ? String(user.doctorId) : 'all'
  ));

  const {
    appointments,
    setAppointments,
    patients,
    doctors,
    clinicSettings,
    isLoading,
    pageError,
  } = useAgendaData();

  const {
    isModalOpen,
    editingAppointmentId,
    patientId,
    doctorId,
    patientSearch,
    doctorSearch,
    patientSelectorOpen,
    doctorSelectorOpen,
    appointmentDate,
    calendarMonth,
    calendarSelection,
    isCalendarOpen,
    appointmentTime,
    duration,
    treatmentType,
    notes,
    submitError,
    isSubmitting,
    recommendedPatientIds,
    patientSearchResults,
    doctorSearchResults,
    appointmentCalendarDays,
    timeOptions,
    durationOptions,
    treatmentOptions,
    availabilityError,
    isAvailabilityLoading,
    openCreateModal,
    closeModal,
    handleSubmit,
    handleCalendarMonthChange,
    handleCalendarDateSelect,
    handleTodaySelect,
    setIsCalendarOpen,
    handlePatientSearchChange,
    handleDoctorSearchChange,
    handleSelectPatient,
    handleSelectDoctor,
    setPatientSelectorOpen,
    setDoctorSelectorOpen,
    setAppointmentTime,
    setDuration,
    setTreatmentType,
    setNotes,
  } = useAppointmentForm({
    selectedDate,
    patients,
    doctors,
    appointments,
    appointmentTypes: clinicSettings?.appointmentTypes || [],
    setAppointments,
    setSelectedDate,
    preferredDoctorId: selectedDoctorId === 'all' ? '' : selectedDoctorId,
  });

  const visibleAppointments = useMemo(() => {
    if (selectedDoctorId === 'all') return appointments;
    return appointments.filter((appointment) => String(appointment.doctorId) === String(selectedDoctorId));
  }, [appointments, selectedDoctorId]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth]);

  const selectedDateAppointments = useMemo(() => {
    return visibleAppointments
      .filter((appointment) => isSameDay(appointment.date, selectedDate))
      .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second));
  }, [selectedDate, visibleAppointments]);

  function handleGoToToday() {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentMonth(today);
  }

  function handlePreviousRange() {
    if (viewType === 'month') {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(currentMonth.getMonth() - 1);
      setCurrentMonth(startOfDay(nextMonth));
      return;
    }

    setSelectedDate((currentDate) => addDays(currentDate, -7));
  }

  function handleNextRange() {
    if (viewType === 'month') {
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(currentMonth.getMonth() + 1);
      setCurrentMonth(startOfDay(nextMonth));
      return;
    }

    setSelectedDate((currentDate) => addDays(currentDate, 7));
  }

  function renderCompactActions(appointment) {
    return (
      <div className="flex flex-wrap gap-2">
        <Link
          to={`/appointments/${appointment.id}`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
        >
          {t('Open appointment')}
        </Link>
        <Link
          to={getPatientDetailPath(appointment.patientId)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100"
        >
          {t('Open patient')}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-10 w-72 animate-pulse rounded-2xl bg-slate-100" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-[520px] animate-pulse rounded-3xl bg-slate-100" />
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <AgendaHeader
        viewType={viewType}
        onViewTypeChange={setViewType}
        onCreateAppointment={() => openCreateModal()}
        onPreviousRange={handlePreviousRange}
        onNextRange={handleNextRange}
        onGoToToday={handleGoToToday}
        doctors={doctors}
        selectedDoctorId={selectedDoctorId}
        onDoctorChange={setSelectedDoctorId}
        isDentist={isDentist}
      />

      {pageError ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {pageError}
        </div>
      ) : null}

      {viewType === 'week' ? (
        <AgendaWeekView
          weekLabel={formatWeekRange(selectedDate)}
          weekDays={weekDays}
          selectedDate={selectedDate}
          appointments={visibleAppointments}
          isSameDay={isSameDay}
          getAppointmentDateTime={getAppointmentDateTime}
          getStatusClasses={getStatusClasses}
          getStatusLabel={getStatusLabel}
          onSelectDate={(day) => setSelectedDate(startOfDay(day))}
          onOpenCreateModal={openCreateModal}
          onOpenAppointment={(appointmentId) => navigate(`/appointments/${appointmentId}`)}
          showDoctor={selectedDoctorId === 'all'}
        />
      ) : (
        <AgendaMonthView
          currentMonth={currentMonth}
          monthDays={monthDays}
          selectedDate={selectedDate}
          appointments={visibleAppointments}
          isSameDay={isSameDay}
          isSameMonth={isSameMonth}
          onSelectDay={(day) => {
            setSelectedDate(startOfDay(day));
            setCurrentMonth(startOfDay(day));
          }}
          onOpenWeek={(day) => {
            setSelectedDate(startOfDay(day));
            setCurrentMonth(startOfDay(day));
            setViewType('week');
          }}
          showDoctor={selectedDoctorId === 'all'}
        />
      )}

      <AgendaDayDetails
        selectedDate={selectedDate}
        appointments={selectedDateAppointments}
        formatFullDate={formatFullDate}
        getStatusClasses={getStatusClasses}
        getStatusLabel={getStatusLabel}
        renderCompactActions={renderCompactActions}
        onOpenCreateModal={() => openCreateModal(selectedDate)}
        showDoctor={selectedDoctorId === 'all'}
      />

      <AppointmentModal
        isOpen={isModalOpen}
        editingAppointmentId={editingAppointmentId}
        isSubmitting={isSubmitting}
        submitError={submitError}
        patients={patients}
        doctors={doctors}
        patientId={patientId}
        doctorId={doctorId}
        patientSearch={patientSearch}
        doctorSearch={doctorSearch}
        patientSelectorOpen={patientSelectorOpen}
        doctorSelectorOpen={doctorSelectorOpen}
        patientSearchResults={patientSearchResults}
        doctorSearchResults={doctorSearchResults}
        recommendedPatientIds={recommendedPatientIds}
        appointmentDate={appointmentDate}
        calendarMonth={calendarMonth}
        calendarSelection={calendarSelection}
        isCalendarOpen={isCalendarOpen}
        appointmentCalendarDays={appointmentCalendarDays}
        appointmentTime={appointmentTime}
        duration={duration}
        treatmentType={treatmentType}
        notes={notes}
        treatmentOptions={treatmentOptions}
        durationOptions={durationOptions}
        timeOptions={timeOptions}
        availabilityError={availabilityError}
        isAvailabilityLoading={isAvailabilityLoading}
        formatCalendarMonth={formatCalendarMonth}
        formatFullDate={formatFullDate}
        isSameDay={isSameDay}
        isSameMonth={isSameMonth}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onPatientSearchChange={handlePatientSearchChange}
        onDoctorSearchChange={handleDoctorSearchChange}
        onPatientFocus={() => setPatientSelectorOpen(true)}
        onPatientBlur={() => setPatientSelectorOpen(false)}
        onDoctorFocus={() => setDoctorSelectorOpen(true)}
        onDoctorBlur={() => setDoctorSelectorOpen(false)}
        onSelectPatient={handleSelectPatient}
        onSelectDoctor={handleSelectDoctor}
        onCalendarMonthChange={handleCalendarMonthChange}
        onCalendarDateSelect={handleCalendarDateSelect}
        onTodaySelect={handleTodaySelect}
        onCalendarToggle={() => setIsCalendarOpen((currentValue) => !currentValue)}
        onAppointmentTimeChange={setAppointmentTime}
        onDurationChange={setDuration}
        onTreatmentTypeChange={setTreatmentType}
        onNotesChange={setNotes}
      />
    </div>
  );
}
