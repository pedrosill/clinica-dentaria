import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, UserRound, X } from 'lucide-react';
import { API_BASE_URL } from '../../constants/agendaConstants';
import Dialog from '../ui/Dialog';
import { getAppointmentDurationOptions } from '../../utils/appointmentTypeUtils';
import useLanguage from '../../context/useLanguage';
import SelectDropdown from '../ui/SelectDropdown';

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateInput(dateValue) {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateValue, amount) {
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function formatLongDate(dateValue, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function formatShortDate(dateValue, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function formatTimeLabel(timeValue) {
  return String(timeValue).slice(0, 5);
}

function getMinutesFromTime(timeValue) {
  const [hours, minutes] = String(timeValue).split(':').map(Number);
  return hours * 60 + minutes;
}

function getSlotState({ slotTime, selectedTime, selectedDuration, blockedSlots, availableStarts }) {
  if (blockedSlots.has(slotTime)) {
    return 'blocked';
  }

  if (!availableStarts.has(slotTime)) {
    return 'invalid';
  }

  if (slotTime === selectedTime && availableStarts.has(slotTime)) {
    return 'selected';
  }

  const slotStart = getMinutesFromTime(slotTime);
  const selectedStart = getMinutesFromTime(selectedTime);
  const selectedEnd = selectedStart + Number(selectedDuration || 30);

  if (slotStart >= selectedStart && slotStart < selectedEnd) {
    return 'selected-range';
  }

  return 'free';
}

function getDoctorName(appointment, t) {
  return appointment?.doctor?.name || t('No doctor assigned');
}

function getPatientName(appointment, t) {
  if (!appointment?.patient) return t('Unknown patient');
  if (appointment.patient.fullName) return appointment.patient.fullName;
  return `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim();
}

export default function RescheduleAppointmentModal({
  isOpen,
  appointment,
  isSubmitting,
  submitError,
  date,
  time,
  duration,
  appointmentTypes,
  onDateChange,
  onTimeChange,
  onDurationChange,
  onClose,
  onSubmit,
}) {
  const { t, locale } = useLanguage();
  const [inspectedDate, setInspectedDate] = useState(date || '');
  const [dayAppointments, setDayAppointments] = useState([]);
  const [daySlotOptions, setDaySlotOptions] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  const daySlots = useMemo(
    () => daySlotOptions.map((slot) => slot.time),
    [daySlotOptions]
  );
  const selectedDuration = useMemo(() => String(duration || '30'), [duration]);
  const durationOptions = useMemo(
    () => getAppointmentDurationOptions(appointmentTypes, appointment?.duration),
    [appointment?.duration, appointmentTypes]
  );

  const blockedSlotTimes = useMemo(() => {
    const blocked = new Set();

    dayAppointments.forEach((dayAppointment) => {
      const appointmentDate = formatDateInput(dayAppointment.date);
      const inspectedDateValue = inspectedDate || date;

      if (appointmentDate !== inspectedDateValue) {
        return;
      }

      const appointmentId = Number(dayAppointment.id);
      const currentAppointmentId = Number(appointment?.id);

      if (appointmentId === currentAppointmentId) {
        return;
      }

      const startMinutes = getMinutesFromTime(dayAppointment.time);
      const endMinutes = startMinutes + Number(dayAppointment.duration || 30);

      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
        blocked.add(`${pad(Math.floor(currentMinutes / 60))}:${pad(currentMinutes % 60)}`);
      }
    });

    return blocked;
  }, [appointment, date, dayAppointments, inspectedDate]);

  const availableStartTimes = useMemo(() => {
    return new Set(
      daySlotOptions
        .filter((slot) => slot.status === 'free')
        .map((slot) => slot.time)
    );
  }, [daySlotOptions]);

  const selectedDateLabel = useMemo(() => {
    if (!date) return t('No date selected');
    return formatLongDate(date, locale);
  }, [date, locale, t]);

  const inspectedDateLabel = useMemo(() => {
    if (!inspectedDate) return t('Loading day...');
    return formatLongDate(inspectedDate, locale);
  }, [inspectedDate, locale, t]);

  const dayTimelineItems = useMemo(() => {
    return daySlots.map((slotTime) => ({
      time: slotTime,
      state: getSlotState({
        slotTime,
        selectedTime: time,
        selectedDuration,
        blockedSlots: blockedSlotTimes,
        availableStarts: availableStartTimes,
      }),
    }));
  }, [availableStartTimes, blockedSlotTimes, daySlots, selectedDuration, time]);

  const dayAppointmentsSummary = useMemo(() => {
    return [...dayAppointments]
      .filter((item) => formatDateInput(item.date) === inspectedDate)
      .sort((first, second) => getMinutesFromTime(first.time) - getMinutesFromTime(second.time));
  }, [dayAppointments, inspectedDate]);

  useEffect(() => {
    if (!isOpen || !appointment?.doctorId || !inspectedDate) {
      return;
    }

    let isMounted = true;

    async function loadDaySchedule() {
      try {
        setIsLoadingSchedule(true);
        setScheduleError('');

        const appointmentsResponse = await fetch(
          `${API_BASE_URL}/api/appointments/${appointment.id}/reschedule-options?date=${encodeURIComponent(
            inspectedDate
          )}&duration=${encodeURIComponent(selectedDuration)}`,
          { credentials: 'include' }
        );

        if (!appointmentsResponse.ok) {
          throw new Error(t('Failed to load inspected day schedule'));
        }

        const appointmentsData = await appointmentsResponse.json();

        if (!isMounted) return;

        const normalizedAppointments = Array.isArray(appointmentsData?.bookedIntervals)
          ? appointmentsData.bookedIntervals.map((interval) => ({
              id: interval.appointmentId,
              date: inspectedDate,
              time: interval.start,
              duration: interval.duration,
              status: interval.status,
              patient: interval.patient,
              treatmentType: interval.treatmentType,
            }))
          : [];

        setDayAppointments(normalizedAppointments);
        setDaySlotOptions(Array.isArray(appointmentsData?.slotOptions) ? appointmentsData.slotOptions : []);
      } catch (error) {
        if (!isMounted) return;
        setScheduleError(error.message || t('Failed to load inspected day schedule'));
        setDayAppointments([]);
        setDaySlotOptions([]);
      } finally {
        if (isMounted) {
          setIsLoadingSchedule(false);
        }
      }
    }

    loadDaySchedule();

    return () => {
      isMounted = false;
    };
  }, [appointment?.doctorId, appointment?.id, inspectedDate, isOpen, selectedDuration, t]);

  function handleInspectPreviousDay() {
    if (!inspectedDate) return;
    setInspectedDate(formatDateInput(addDays(parseDateOnly(inspectedDate), -1)));
  }

  function handleInspectNextDay() {
    if (!inspectedDate) return;
    setInspectedDate(formatDateInput(addDays(parseDateOnly(inspectedDate), 1)));
  }

  function handleSelectSlot(slotTime) {
    if (!availableStartTimes.has(slotTime)) {
      return;
    }

    onDateChange(inspectedDate);
    onTimeChange(slotTime);
  }

  if (!isOpen || !appointment) {
    return null;
  }

  return (
    <div data-testid="reschedule-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <Dialog
        isOpen={isOpen && Boolean(appointment)}
        onClose={onClose}
        isCloseDisabled={isSubmitting}
        labelledBy="reschedule-appointment-modal-title"
        className="flex max-h-[94vh] min-h-[760px] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 md:px-8">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-teal-800">{t('Scheduling workflow')}</p>
            <h2 id="reschedule-appointment-modal-title" className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {t('Reschedule Appointment')}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {t("Inspect the doctor's day timeline, choose a valid free slot, and keep the booking flow safely aligned with backend conflict rules.")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={t('Close reschedule modal')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.6fr)_420px]">
          <section className="flex min-h-0 flex-col border-b border-slate-200 xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-200 px-6 py-5 md:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{t('Inspected day schedule')}</p>
                  <p className="mt-1 text-sm text-slate-600">{inspectedDateLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleInspectPreviousDay}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {t('Previous day')}
                  </button>

                  <button
                    type="button"
                    onClick={handleInspectNextDay}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  >
                    {t('Next day')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {t('Free selectable')}
                </span>
                <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-rose-700 ring-1 ring-inset ring-rose-200">
                  {t('Booked / blocked')}
                </span>
                <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-teal-700 ring-1 ring-inset ring-teal-200">
                  {t('Selected')}
                </span>
              </div>

              {scheduleError ? (
                <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  {scheduleError}
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
              {isLoadingSchedule ? (
                <div className="space-y-3">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                    />
                  ))}
                </div>
              ) : dayTimelineItems.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-amber-900">{t('Clinic closed')}</p>
                  <p className="mt-2 text-sm text-amber-800">
                    {t('No appointment starts are available on this date.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayTimelineItems.map((slot) => {
                    const slotState = slot.state;
                    const isSelectable = slotState === 'free' || slotState === 'selected';
                    const isBooked = slotState === 'blocked' || slotState === 'invalid';
                    const isSelected = slotState === 'selected' || slotState === 'selected-range';

                    const baseClasses =
                      'w-full rounded-2xl border px-4 py-4 text-left transition';
                    const stateClasses = isSelected
                      ? 'border-teal-300 bg-teal-50 shadow-sm'
                      : isBooked
                        ? 'border-slate-200 bg-slate-100/80 opacity-80'
                        : 'border-slate-300 bg-white hover:border-teal-300 hover:bg-teal-50/50';

                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => handleSelectSlot(slot.time)}
                        className={`${baseClasses} ${stateClasses} ${
                          !isSelectable ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset ${
                                isSelected
                                  ? 'bg-teal-100 text-teal-800 ring-teal-200'
                                  : isBooked
                                    ? 'bg-slate-200 text-slate-500 ring-slate-300'
                                    : 'bg-white text-slate-700 ring-slate-300'
                              }`}
                            >
                              <Clock3 className="h-5 w-5" />
                            </div>

                            <div>
                              <p className="text-base font-semibold text-slate-950">
                                {formatTimeLabel(slot.time)}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {isSelected
                                   ? `${t('Selected for')} ${selectedDuration} ${t('min')}`
                                   : isBooked
                                     ? t('Unavailable for this duration')
                                     : t('Available to book')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {slotState === 'selected' ? (
                              <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                                 {t('Start time')}
                              </span>
                            ) : null}

                            {slotState === 'selected-range' ? (
                              <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                                 {t('Selected range')}
                              </span>
                            ) : null}

                            {slotState === 'blocked' ? (
                              <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                                 {t('Booked')}
                              </span>
                            ) : null}

                            {slotState === 'invalid' ? (
                              <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
                                 {t('Conflicts with duration')}
                              </span>
                            ) : null}

                            {slotState === 'free' ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                 {t('Select slot')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <aside className="flex min-h-0 flex-col bg-slate-50/70">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-7">
              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-300">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div>
                       <p className="text-sm font-semibold text-slate-950">{t('Appointment summary')}</p>
                       <p className="text-sm text-slate-600">{t('Current booking context')}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                         {t('Patient')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                         {getPatientName(appointment, t)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                         {t('Doctor')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                         {getDoctorName(appointment, t)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                         {t('Treatment')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                         {appointment.treatmentType || t('Not recorded')}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-300">
                      <CalendarDays className="h-5 w-5" />
                    </div>

                    <div>
                       <p className="text-sm font-semibold text-slate-950">{t('Selected slot')}</p>
                       <p className="text-sm text-slate-600">{t('What will be submitted')}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                         {t('Date')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {selectedDateLabel}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                         {t('Time')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                         {time ? formatTimeLabel(time) : t('No time selected')}
                      </p>
                    </div>

                    <SelectDropdown
                      label={t('Duration')}
                      value={selectedDuration}
                      onChange={onDurationChange}
                      disabled={isSubmitting}
                      options={durationOptions.map((option) => ({ value: String(option.value), label: `${option.value} ${t('min')}` }))}
                    />

                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                         {t('Original booking')}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                         {formatShortDate(appointment.date, locale)} {t('at')} {formatTimeLabel(appointment.time)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
                   <p className="text-sm font-semibold text-slate-950">{t('Inspected day bookings')}</p>
                   <p className="mt-1 text-sm text-slate-600">
                     {t('Existing appointments already blocking this doctor on')} {inspectedDateLabel}.
                  </p>

                  <div className="mt-4 space-y-3">
                    {dayAppointmentsSummary.length > 0 ? (
                      dayAppointmentsSummary.map((item) => {
                        const isCurrentAppointment = Number(item.id) === Number(appointment.id);

                        return (
                          <div
                            key={item.id}
                            className={`border-t p-4 first:border-t-0 first:pt-0 ${
                              isCurrentAppointment
                                ? 'border-sky-200 bg-sky-50'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">
                                   {formatTimeLabel(item.time)} · {Number(item.duration || 30)} {t('min')}
                                </p>
                                <p className="mt-1 text-sm text-slate-700">
                                   {getPatientName(item)}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                   {item.treatmentType || t('Not recorded')}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                                  isCurrentAppointment
                                    ? 'bg-sky-100 text-sky-700 ring-sky-200'
                                    : 'bg-slate-200 text-slate-700 ring-slate-300'
                                }`}
                              >
                                 {isCurrentAppointment ? t('Current') : t('Booked')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                       <div className="border-t border-dashed border-slate-300 pt-6 text-center">
                        <p className="text-sm font-medium text-slate-800">
                           {t('No bookings found for this inspected day.')}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                           {t('All valid timeline starts for the selected duration are currently open.')}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-slate-300 bg-white/95 px-6 py-5 backdrop-blur md:px-7">
              {submitError ? (
                <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  {submitError}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                     {t('Ready to submit')}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                     {date ? formatShortDate(date, locale) : t('No date selected')} ·{' '}
                     {time ? formatTimeLabel(time) : t('No time selected')} · {selectedDuration} {t('min')}
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                     {t('Cancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !date || !time || !availableStartTimes.has(time)}
                    className="inline-flex min-w-44 items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                     {isSubmitting ? t('Saving...') : t('Save reschedule')}
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      </Dialog>
    </div>
  );
}
