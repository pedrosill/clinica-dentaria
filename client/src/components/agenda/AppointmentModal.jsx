import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { getPatientDisplayName } from '../../utils/agendaUtils';
import SelectDropdown from '../ui/SelectDropdown';

export default function AppointmentModal({
  isOpen,
  editingAppointmentId,
  isSubmitting,
  submitError,
  patientId,
  doctorId,
  patientSearch,
  doctorSearch,
  patientSelectorOpen,
  doctorSelectorOpen,
  patientSearchResults,
  doctorSearchResults,
  recommendedPatientIds,
  appointmentDate,
  calendarMonth,
  calendarSelection,
  isCalendarOpen,
  appointmentCalendarDays,
  appointmentTime,
  duration,
  durationOptions,
  treatmentType,
  notes,
  treatmentOptions,
  timeOptions,
  availabilityError,
  isAvailabilityLoading,
  formatCalendarMonth,
  formatFullDate,
  isSameDay,
  isSameMonth,
  onClose,
  onSubmit,
  onPatientSearchChange,
  onDoctorSearchChange,
  onPatientFocus,
  onPatientBlur,
  onDoctorFocus,
  onDoctorBlur,
  onSelectPatient,
  onSelectDoctor,
  onCalendarMonthChange,
  onCalendarDateSelect,
  onTodaySelect,
  onCalendarToggle,
  onAppointmentTimeChange,
  onDurationChange,
  onTreatmentTypeChange,
  onNotesChange,
}) {
  const recommendedPatients = useMemo(
    () => patientSearchResults.filter((patient) => recommendedPatientIds.has(patient.id)),
    [patientSearchResults, recommendedPatientIds]
  );

  const otherPatients = useMemo(
    () => patientSearchResults.filter((patient) => !recommendedPatientIds.has(patient.id)),
    [patientSearchResults, recommendedPatientIds]
  );

  const treatmentSelectOptions = treatmentOptions.map((option) => ({
    value: option,
    label: option,
  }));

  const timeSelectOptions = timeOptions.map((option) => {
    const time = typeof option === 'string' ? option : option.time;
    const status = typeof option === 'string' ? 'free' : option.status;
    const statusLabel = {
      free: 'Free',
      booked: 'Booked',
      unavailable: 'Unavailable',
      existing: 'Existing',
      loading: 'Select doctor',
      'select-doctor': 'Select doctor',
    }[status] || 'Unavailable';

    return {
      value: time,
      label: `${time} · ${statusLabel}`,
      disabled: ['booked', 'unavailable', 'loading', 'select-doctor'].includes(status),
    };
  });

  if (!isOpen) return null;

  return (
    <div data-testid="appointment-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-300 bg-white p-6 shadow-xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-teal-800">
              {editingAppointmentId ? 'Reschedule booking' : 'New booking'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {editingAppointmentId ? 'Update Appointment' : 'Create Appointment'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {submitError ? (
          <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {submitError}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-800">Patient</label>
              <div className="relative">
                <input
                  data-testid="appointment-patient"
                  type="text"
                  value={patientSearch}
                  placeholder="Search by name or phone"
                  onFocus={onPatientFocus}
                  onBlur={onPatientBlur}
                  onChange={(event) => onPatientSearchChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-700 focus:bg-white focus:outline-none"
                />

                {patientSelectorOpen ? (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-lg">
                    <>
                      {recommendedPatients.length > 0 ? (
                        <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Recommended
                        </p>
                      ) : null}

                      {recommendedPatients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onMouseDown={() => onSelectPatient(patient)}
                          className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                            String(patient.id) === patientId
                              ? 'bg-slate-50 text-slate-950'
                              : 'text-slate-800'
                          }`}
                        >
                          {getPatientDisplayName(patient)}
                          {patient.phone ? (
                            <span className="ml-2 text-xs text-slate-500">{patient.phone}</span>
                          ) : null}
                        </button>
                      ))}

                      {otherPatients.length > 0 && recommendedPatients.length > 0 ? (
                        <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          All patients
                        </p>
                      ) : null}

                      {otherPatients.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onMouseDown={() => onSelectPatient(patient)}
                          className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                            String(patient.id) === patientId
                              ? 'bg-slate-50 text-slate-950'
                              : 'text-slate-800'
                          }`}
                        >
                          {getPatientDisplayName(patient)}
                          {patient.phone ? (
                            <span className="ml-2 text-xs text-slate-500">{patient.phone}</span>
                          ) : null}
                        </button>
                      ))}

                      {recommendedPatients.length === 0 && otherPatients.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-500">No patients found</p>
                      ) : null}
                    </>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-800">Doctor</label>
              <div className="relative">
                <input
                  data-testid="appointment-doctor"
                  type="text"
                  value={doctorSearch}
                  placeholder="Search by doctor name, email or phone"
                  onFocus={onDoctorFocus}
                  onBlur={onDoctorBlur}
                  onChange={(event) => onDoctorSearchChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-700 focus:bg-white focus:outline-none"
                />

                {doctorSelectorOpen ? (
                  <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-lg">
                    {doctorSearchResults.map((doctor) => (
                      <button
                        key={doctor.id}
                        type="button"
                        onMouseDown={() => onSelectDoctor(doctor)}
                        className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                          String(doctor.id) === doctorId
                            ? 'bg-slate-50 text-slate-950'
                            : 'text-slate-800'
                        }`}
                      >
                        {doctor.name}
                        {doctor.email ? (
                          <span className="ml-2 text-xs text-slate-500">{doctor.email}</span>
                        ) : doctor.phone ? (
                          <span className="ml-2 text-xs text-slate-500">{doctor.phone}</span>
                        ) : null}
                      </button>
                    ))}

                    {doctorSearchResults.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500">No doctors found</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-800">Date</label>

              <div className="rounded-3xl border border-slate-300 bg-slate-50 p-3 shadow-sm">
                {isCalendarOpen ? (
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => onCalendarMonthChange(-1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Appointment date
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-950">
                      {formatCalendarMonth(calendarMonth)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCalendarMonthChange(1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={onCalendarToggle}
                  data-testid="appointment-date-toggle"
                  aria-expanded={isCalendarOpen}
                  className="mt-3 flex w-full items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-left transition hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-200"
                >
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                      Selected date
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-slate-950">
                      {formatFullDate(calendarSelection)}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-teal-700">
                    {isCalendarOpen ? 'Hide calendar' : 'Choose date'}
                  </span>
                </button>

                {isCalendarOpen ? (
                  <>
                <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                    <div key={label} className="py-1">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                  {appointmentCalendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, calendarMonth);
                    const isSelected = isSameDay(day, calendarSelection);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        data-testid={`appointment-date-${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`}
                        onClick={() => onCalendarDateSelect(day)}
                        className={`flex h-9 items-center justify-center rounded-xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-200 ${
                          isSelected
                            ? 'border-teal-700 bg-teal-700 text-white'
                            : isCurrentMonth
                              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                              : 'border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200'
                        } ${isToday && !isSelected ? 'ring-1 ring-inset ring-teal-200' : ''}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Selected
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {formatFullDate(calendarSelection)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onTodaySelect}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    Today
                  </button>
                </div>
                  </>
                ) : null}

                <input type="hidden" value={appointmentDate} readOnly />
              </div>
            </div>

            <SelectDropdown
              label="Time"
              value={appointmentTime}
              options={timeSelectOptions}
              onChange={onAppointmentTimeChange}
              disabled={isSubmitting || isAvailabilityLoading}
            />

            {availabilityError ? (
              <p className="text-xs font-medium text-red-700 lg:col-span-2">
                {availabilityError}
              </p>
            ) : doctorId ? (
              <p className="text-xs text-slate-500 lg:col-span-2">
                Availability shown from 08:00 to 19:30 for the selected doctor, date and duration.
              </p>
            ) : (
              <p className="text-xs text-slate-500 lg:col-span-2">
                Select a doctor to see which 30-minute slots are free or booked.
              </p>
            )}

            <SelectDropdown
              label="Duration"
              value={duration}
              options={durationOptions}
              onChange={onDurationChange}
              disabled={isSubmitting}
            />

            <SelectDropdown
              label="Treatment"
              value={treatmentType}
              options={treatmentSelectOptions}
              onChange={onTreatmentTypeChange}
              disabled={isSubmitting}
              className="lg:col-span-2"
            />

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-800">Notes</label>
              <textarea
                rows="4"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-700 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-300 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="appointment-submit"
              className="inline-flex items-center justify-center rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? 'Saving...'
                : editingAppointmentId
                  ? 'Save Changes'
                  : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
