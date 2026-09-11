/* ================================
   Imports
================================ */
import { useMemo } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import SelectDropdown from '../ui/SelectDropdown';
import { formatLongDate, getStatusClasses, getStatusLabel } from '../../utils/appointmentDetailUtils';
import {
  EMPTY_APPOINTMENT_TYPE_OPTION,
  getAppointmentTypeOptions,
} from '../../utils/appointmentTypeUtils';
import { getPatientDisplayName } from '../../utils/agendaUtils';

/* ================================
   Component
================================ */
export default function AppointmentInfoSection({
  appointment,
  patients,
  doctors,
  appointmentTypes,
  isEditing,
  isCompletedAppointment,
  isSubmitting,
  patientId,
  doctorId,
  treatmentType,
  notes,
  onPatientChange,
  onDoctorChange,
  onTreatmentTypeChange,
  onNotesChange,
  onCancelEdit,
  onSave,
}) {
  const patientOptions = useMemo(
    () =>
      patients.map((patientOption) => ({
        value: String(patientOption.id),
        label: getPatientDisplayName(patientOption),
      })),
    [patients]
  );

  const doctorOptions = useMemo(
    () =>
      doctors.map((doctorOption) => ({
        value: String(doctorOption.id),
        label: doctorOption.name,
      })),
    [doctors]
  );

  const treatmentOptions = useMemo(
    () => {
      const options = getAppointmentTypeOptions(appointmentTypes, appointment?.treatmentType);
      return options.length > 0 ? options : [EMPTY_APPOINTMENT_TYPE_OPTION];
    },
    [appointment?.treatmentType, appointmentTypes]
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <CalendarDays className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isCompletedAppointment ? 'Completion record' : 'Appointment information'}
          </h2>
          <p className="text-sm text-slate-500">
            {isCompletedAppointment
              ? 'Final outcome and clinical notes for this completed visit.'
              : 'Scheduling and follow-up use the same validated booking flow.'}
          </p>
        </div>
      </div>

      {!isEditing ? (
        isCompletedAppointment ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Date
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {formatLongDate(appointment.date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClasses(
                  appointment.status
                )}`}
              >
                {getStatusLabel(appointment.status)}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Performed treatment
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.performedTreatment || 'Not recorded yet'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Completion note
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.completionNotes || 'No completion note recorded.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Date
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {formatLongDate(appointment.date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Time
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{appointment.time}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Duration
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.duration || 30} minutes
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Status
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusClasses(
                  appointment.status
                )}`}
              >
                {getStatusLabel(appointment.status)}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Scheduled treatment
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.treatmentType || 'Not recorded'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Doctor
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.doctor?.name || 'No doctor assigned'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Performed treatment
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.performedTreatment || 'Not recorded yet'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Scheduling notes
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.notes || 'No scheduling notes recorded.'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Completion note
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {appointment.completionNotes || 'No completion note recorded.'}
              </p>
            </div>
          </div>
        )
      ) : (
        <form onSubmit={onSave} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Update the patient, doctor, treatment, or notes here. Use Reschedule to change the
            appointment date, time, or duration.
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <SelectDropdown
                label="Patient"
                value={patientId}
                onChange={onPatientChange}
                options={patientOptions}
                placeholder="Select a patient"
                disabled={isSubmitting}
              />
            </div>

            <div className="lg:col-span-2">
              <SelectDropdown
                label="Doctor"
                value={doctorId}
                onChange={onDoctorChange}
                options={doctorOptions}
                placeholder="Select a doctor"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <SelectDropdown
                label="Scheduled treatment"
                value={treatmentType}
                onChange={onTreatmentTypeChange}
                options={treatmentOptions}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Scheduling notes</label>
              <textarea
                rows="4"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
