import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, UserRound, X } from 'lucide-react';
import { API_BASE_URL } from '../../constants/agendaConstants';
import Dialog from '../ui/Dialog';
import { getAppointmentDurationOptions } from '../../utils/appointmentTypeUtils';

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

function formatLongDate(dateValue) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateValue));
}

function formatShortDate(dateValue) {
  return new Intl.DateTimeFormat('en-GB', {
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

function getDoctorName(appointment) {
  return appointment?.doctor?.name || 'No doctor assigned';
}

function getPatientName(appointment) {
  if (!appointment?.patient) return 'Unknown patient';
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
    if (!date) return 'No date selected';
    return formatLongDate(date);
  }, [date]);

  const inspectedDateLabel = useMemo(() => {
    if (!inspectedDate) return 'Loading day...';
    return formatLongDate(inspectedDate);
  }, [inspectedDate]);

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
          throw new Error('Failed to load inspected day schedule');
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
        setScheduleError(error.message || 'Failed to load inspected day schedule');
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
  }, [appointment?.doctorId, appointment?.id, inspectedDate, isOpen, selectedDuration]);

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
            <p className="text-sm font-semibold text-teal-800">Scheduling workflow</p>
            <h2 id="reschedule-appointment-modal-title" className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Reschedule Appointment
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Inspect the doctor&apos;s day timeline, choose a valid free slot, and keep the
              booking flow safely aligned with backend conflict rules.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Close reschedule modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.6fr)_420px]">
          <section className="flex min-h-0 flex-col border-b border-slate-200 xl:border-b-0 xl:border-r">
            <div className="border-b border-slate-200 px-6 py-5 md:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Inspected day schedule</p>
                  <p className="mt-1 text-sm text-slate-600">{inspectedDateLabel}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleInspectPreviousDay}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous day
                  </button>

                  <button
                    type="button"
                    onClick={handleInspectNextDay}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  >
                    Next day
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Free selectable
                </span>
                <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-rose-700 ring-1 ring-inset ring-rose-200">
                  Booked / blocked
                </span>
                <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-teal-700 ring-1 ring-inset ring-teal-200">
                  Selected
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
                  <p className="text-sm font-semibold text-amber-900">Clinic closed</p>
                  <p className="mt-2 text-sm text-amber-800">
                    No appointment starts are available on this date.
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
                                  ? `Selected for ${selectedDuration} min`
                                  : isBooked
                                    ? 'Unavailable for this duration'
                                    : 'Available to book'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {slotState === 'selected' ? (
                              <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                                Start time
                              </span>
                            ) : null}

                            {slotState === 'selected-range' ? (
                              <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                                Selected range
                              </span>
                            ) : null}

                            {slotState === 'blocked' ? (
                              <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                                Booked
                              </span>
                            ) : null}

                            {slotState === 'invalid' ? (
                              <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
                                Conflicts with duration
                              </span>
                            ) : null}

                            {slotState === 'free' ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                Select slot
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
                      <p className="text-sm font-semibold text-slate-950">Appointment summary</p>
                      <p className="text-sm text-slate-600">Current booking context</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Patient
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {getPatientName(appointment)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Doctor
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {getDoctorName(appointment)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Treatment
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {appointment.treatmentType || 'Not recorded'}
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
                      <p className="text-sm font-semibold text-slate-950">Selected slot</p>
                      <p className="text-sm text-slate-600">What will be submitted</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                        Date
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {selectedDateLabel}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                        Time
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {time ? formatTimeLabel(time) : 'No time selected'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Duration</label>
                      <select
                        value={selectedDuration}
                        onChange={(event) => onDurationChange(event.target.value)}
                        disabled={isSubmitting}
                        className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:bg-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {durationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        Original booking
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {formatShortDate(appointment.date)} at {formatTimeLabel(appointment.time)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">Inspected day bookings</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Existing appointments already blocking this doctor on {inspectedDateLabel}.
                  </p>

                  <div className="mt-4 space-y-3">
                    {dayAppointmentsSummary.length > 0 ? (
                      dayAppointmentsSummary.map((item) => {
                        const isCurrentAppointment = Number(item.id) === Number(appointment.id);

                        return (
                          <div
                            key={item.id}
                            className={`rounded-2xl border p-4 ${
                              isCurrentAppointment
                                ? 'border-sky-200 bg-sky-50'
                                : 'border-slate-300 bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-950">
                                  {formatTimeLabel(item.time)} · {Number(item.duration || 30)} min
                                </p>
                                <p className="mt-1 text-sm text-slate-700">
                                   {getPatientName(item)}
                                </p>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                  {item.treatmentType || 'Not recorded'}
                                </p>
                              </div>

                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                                  isCurrentAppointment
                                    ? 'bg-sky-100 text-sky-700 ring-sky-200'
                                    : 'bg-slate-200 text-slate-700 ring-slate-300'
                                }`}
                              >
                                {isCurrentAppointment ? 'Current' : 'Booked'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
                        <p className="text-sm font-medium text-slate-800">
                          No bookings found for this inspected day.
                        </p>
                        <p className="mt-2 text-sm text-slate-600">
                          All valid timeline starts for the selected duration are currently open.
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
                    Ready to submit
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {date ? formatShortDate(date) : 'No date selected'} ·{' '}
                    {time ? formatTimeLabel(time) : 'No time selected'} · {selectedDuration} min
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !date || !time || !availableStartTimes.has(time)}
                    className="inline-flex min-w-44 items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Saving...' : 'Save reschedule'}
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
