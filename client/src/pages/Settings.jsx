import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Plus,
  Save,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '../context/useAuth';
import { getDoctors } from '../services/doctors';
import {
  archiveAppointmentType,
  createAppointmentType,
  createClinicClosure,
  deleteClinicClosure,
  getClinicSettings,
  updateAppointmentType,
  updateClinicSettings,
  updateProviderSchedule,
} from '../services/settings';

const WEEKDAYS = [
  { weekday: 1, label: 'Monday' },
  { weekday: 2, label: 'Tuesday' },
  { weekday: 3, label: 'Wednesday' },
  { weekday: 4, label: 'Thursday' },
  { weekday: 5, label: 'Friday' },
  { weekday: 6, label: 'Saturday' },
  { weekday: 0, label: 'Sunday' },
];

const DEFAULT_DAY = {
  isOpen: false,
  startTime: '08:00',
  endTime: '20:00',
  breakStart: '',
  breakEnd: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100';

function buildScheduleDraft(schedules = []) {
  return WEEKDAYS.map(({ weekday }) => ({
    weekday,
    ...DEFAULT_DAY,
    ...(schedules.find((schedule) => schedule.weekday === weekday) || {}),
    breakStart: schedules.find((schedule) => schedule.weekday === weekday)?.breakStart || '',
    breakEnd: schedules.find((schedule) => schedule.weekday === weekday)?.breakEnd || '',
  }));
}

function buildProviderDraft(doctorId, settings) {
  return buildScheduleDraft(settings?.schedules).map((day) => {
    const override = settings?.providerSchedules?.find(
      (schedule) => Number(schedule.doctorId) === Number(doctorId) && schedule.weekday === day.weekday
    );

    return {
      weekday: day.weekday,
      isWorking: override ? override.isWorking : day.isOpen,
      startTime: override?.startTime || day.startTime,
      endTime: override?.endTime || day.endTime,
      breakStart: override?.breakStart || '',
      breakEnd: override?.breakEnd || '',
    };
  });
}

export default function Settings() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const [settings, setSettings] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState([]);
  const [clinicForm, setClinicForm] = useState({ clinicName: '', timezone: '' });
  const [doctors, setDoctors] = useState([]);
  const [providerDrafts, setProviderDrafts] = useState({});
  const [closureForm, setClosureForm] = useState({ date: '', label: '' });
  const [typeForm, setTypeForm] = useState({ name: '', duration: '30' });
  const [typeDrafts, setTypeDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadSettings() {
    setIsLoading(true);
    setError('');

    try {
      const [settingsData, doctorsData] = await Promise.all([getClinicSettings(), getDoctors()]);
      setSettings(settingsData);
      setScheduleDraft(buildScheduleDraft(settingsData.schedules));
      setClinicForm({ clinicName: settingsData.clinicName, timezone: settingsData.timezone });
      setDoctors(doctorsData);
      setProviderDrafts(
        Object.fromEntries(
          doctorsData.map((doctor) => [doctor.id, buildProviderDraft(doctor.id, settingsData)])
        )
      );
      setTypeDrafts(
        Object.fromEntries(
          settingsData.appointmentTypes.map((type) => [type.id, {
            name: type.name,
            duration: String(type.duration),
          }])
        )
      );
    } catch (requestError) {
      setError(requestError.message || 'Failed to load clinic settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Loading external settings is intentionally initiated when this page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, []);

  const activeTypes = useMemo(
    () => settings?.appointmentTypes?.filter((type) => type.isActive !== false) || [],
    [settings]
  );

  function showSuccess(message) {
    setError('');
    setSuccess(message);
  }

  function updateDay(weekday, changes) {
    setScheduleDraft((current) => current.map((day) => (
      day.weekday === weekday ? { ...day, ...changes } : day
    )));
  }

  async function handleSaveClinicSettings(event) {
    event.preventDefault();
    if (!canManage) return;

    try {
      setIsSaving(true);
      setError('');
      const updated = await updateClinicSettings({
        ...clinicForm,
        slotIntervalMinutes: 30,
        schedules: scheduleDraft,
      });
      setSettings(updated);
      setScheduleDraft(buildScheduleDraft(updated.schedules));
      showSuccess('Clinic schedule saved. Availability now uses these hours.');
    } catch (requestError) {
      setError(requestError.message || 'Failed to save clinic settings');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddClosure(event) {
    event.preventDefault();
    if (!canManage) return;

    try {
      setIsSaving(true);
      const closure = await createClinicClosure(closureForm);
      setSettings((current) => ({ ...current, closures: [...current.closures, closure].sort((a, b) => a.date.localeCompare(b.date)) }));
      setClosureForm({ date: '', label: '' });
      showSuccess('Closure added. No appointments can be booked on that date.');
    } catch (requestError) {
      setError(requestError.message || 'Failed to add closure');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteClosure(closureId) {
    if (!canManage) return;

    try {
      setIsSaving(true);
      await deleteClinicClosure(closureId);
      setSettings((current) => ({
        ...current,
        closures: current.closures.filter((closure) => closure.id !== closureId),
      }));
      showSuccess('Closure removed.');
    } catch (requestError) {
      setError(requestError.message || 'Failed to remove closure');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddType(event) {
    event.preventDefault();
    if (!canManage) return;

    try {
      setIsSaving(true);
      const appointmentType = await createAppointmentType(typeForm);
      setSettings((current) => ({
        ...current,
        appointmentTypes: [...current.appointmentTypes, appointmentType],
      }));
      setTypeDrafts((current) => ({
        ...current,
        [appointmentType.id]: { name: appointmentType.name, duration: String(appointmentType.duration) },
      }));
      setTypeForm({ name: '', duration: '30' });
      showSuccess('Appointment type added.');
    } catch (requestError) {
      setError(requestError.message || 'Failed to add appointment type');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveType(typeId) {
    if (!canManage) return;

    try {
      setIsSaving(true);
      const updated = await updateAppointmentType(typeId, typeDrafts[typeId]);
      setSettings((current) => ({
        ...current,
        appointmentTypes: current.appointmentTypes.map((type) => type.id === typeId ? updated : type),
      }));
      showSuccess('Appointment type saved.');
    } catch (requestError) {
      setError(requestError.message || 'Failed to save appointment type');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveType(typeId) {
    if (!canManage) return;

    try {
      setIsSaving(true);
      await archiveAppointmentType(typeId);
      setSettings((current) => ({
        ...current,
        appointmentTypes: current.appointmentTypes.map((type) => type.id === typeId ? { ...type, isActive: false } : type),
      }));
      showSuccess('Appointment type archived. Existing appointments are unchanged.');
    } catch (requestError) {
      setError(requestError.message || 'Failed to archive appointment type');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveProviderSchedule(doctorId) {
    if (!canManage) return;

    try {
      setIsSaving(true);
      const updated = await updateProviderSchedule(doctorId, { days: providerDrafts[doctorId] });
      setSettings(updated);
      showSuccess('Provider schedule saved.');
    } catch (requestError) {
      setError(requestError.message || 'Failed to save provider schedule');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="w-full rounded-3xl border border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm">Loading clinic settings…</div>;
  }

  return (
    <div className="w-full space-y-6">
      <section className="clinic-panel rounded-3xl p-6 md:p-8">
        <p className="text-sm font-medium text-teal-700">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Clinic setup</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Configure the operational rules used by the agenda, new appointments, and rescheduling.
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</div> : null}
      {!canManage ? <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Only administrators can change clinic settings.</div> : null}

      <form onSubmit={handleSaveClinicSettings} className="clinic-panel rounded-3xl p-6 md:p-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><CalendarClock className="h-5 w-5" /></div>
          <div><h2 className="text-xl font-semibold text-slate-900">Practice schedule</h2><p className="mt-1 text-sm leading-6 text-slate-600">These hours control every available start time in the booking engine.</p></div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">Clinic name<input className={inputClass} value={clinicForm.clinicName} onChange={(event) => setClinicForm({ ...clinicForm, clinicName: event.target.value })} disabled={!canManage} /></label>
          <label className="space-y-2 text-sm font-medium text-slate-700">Timezone<input className={inputClass} value={clinicForm.timezone} onChange={(event) => setClinicForm({ ...clinicForm, timezone: event.target.value })} disabled={!canManage} /></label>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-300">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold text-slate-700">Day</th><th className="px-4 py-3 text-left font-semibold text-slate-700">Open</th><th className="px-4 py-3 text-left font-semibold text-slate-700">Hours</th><th className="px-4 py-3 text-left font-semibold text-slate-700">Break</th></tr></thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {scheduleDraft.map((day) => {
                const label = WEEKDAYS.find((item) => item.weekday === day.weekday)?.label;
                return <tr key={day.weekday}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{label}</td>
                  <td className="px-4 py-3"><input type="checkbox" checked={day.isOpen} onChange={(event) => updateDay(day.weekday, { isOpen: event.target.checked })} disabled={!canManage} className="h-4 w-4 accent-teal-700" aria-label={`${label} open`} /></td>
                  <td className="px-4 py-3"><div className="flex min-w-64 gap-2"><input type="time" step="1800" className={inputClass} value={day.startTime} onChange={(event) => updateDay(day.weekday, { startTime: event.target.value })} disabled={!canManage || !day.isOpen} /><span className="self-center text-slate-400">to</span><input type="time" step="1800" className={inputClass} value={day.endTime} onChange={(event) => updateDay(day.weekday, { endTime: event.target.value })} disabled={!canManage || !day.isOpen} /></div></td>
                  <td className="px-4 py-3"><div className="flex min-w-64 gap-2"><input type="time" step="1800" className={inputClass} value={day.breakStart} onChange={(event) => updateDay(day.weekday, { breakStart: event.target.value })} disabled={!canManage || !day.isOpen} /><span className="self-center text-slate-400">to</span><input type="time" step="1800" className={inputClass} value={day.breakEnd} onChange={(event) => updateDay(day.weekday, { breakEnd: event.target.value })} disabled={!canManage || !day.isOpen} /></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Appointment grid is fixed at 30 minutes. The latest valid start is calculated from the closing time and duration.</p><button type="submit" disabled={!canManage || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />Save schedule</button></div>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="clinic-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Clock3 className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">Closures and holidays</h2><p className="mt-1 text-sm leading-6 text-slate-600">Block a specific date without changing the weekly schedule.</p></div></div>
          <form onSubmit={handleAddClosure} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]"><input required type="date" className={inputClass} value={closureForm.date} onChange={(event) => setClosureForm({ ...closureForm, date: event.target.value })} disabled={!canManage || isSaving} /><input required placeholder="Reason, e.g. Christmas" className={inputClass} value={closureForm.label} onChange={(event) => setClosureForm({ ...closureForm, label: event.target.value })} disabled={!canManage || isSaving} /><button type="submit" disabled={!canManage || isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Plus className="h-4 w-4" />Add</button></form>
          <div className="mt-5 space-y-2">{settings?.closures?.length ? settings.closures.map((closure) => <div key={closure.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm"><div><span className="font-semibold text-slate-900">{closure.date}</span><span className="ml-2 text-slate-600">{closure.label}</span></div><button type="button" onClick={() => handleDeleteClosure(closure.id)} disabled={!canManage || isSaving} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-700 disabled:opacity-50" aria-label={`Remove ${closure.label}`}><Trash2 className="h-4 w-4" /></button></div>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">No special closures configured.</p>}</div>
        </section>

        <section className="clinic-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Stethoscope className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">Appointment types</h2><p className="mt-1 text-sm leading-6 text-slate-600">Templates set the default duration used by new bookings.</p></div></div>
          <form onSubmit={handleAddType} className="mt-6 grid gap-3 sm:grid-cols-[1fr_110px_auto]"><input required placeholder="Appointment type" className={inputClass} value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} disabled={!canManage || isSaving} /><select className={inputClass} value={typeForm.duration} onChange={(event) => setTypeForm({ ...typeForm, duration: event.target.value })} disabled={!canManage || isSaving}>{[30, 60, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} min</option>)}</select><button type="submit" disabled={!canManage || isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Plus className="h-4 w-4" />Add</button></form>
          <div className="mt-5 space-y-2">{activeTypes.map((type) => <div key={type.id} className="grid gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3 sm:grid-cols-[1fr_110px_auto_auto]"><input className={inputClass} value={typeDrafts[type.id]?.name || ''} onChange={(event) => setTypeDrafts({ ...typeDrafts, [type.id]: { ...typeDrafts[type.id], name: event.target.value } })} disabled={!canManage || isSaving} /><select className={inputClass} value={typeDrafts[type.id]?.duration || String(type.duration)} onChange={(event) => setTypeDrafts({ ...typeDrafts, [type.id]: { ...typeDrafts[type.id], duration: event.target.value } })} disabled={!canManage || isSaving}>{[30, 60, 90, 120].map((duration) => <option key={duration} value={duration}>{duration} min</option>)}</select><button type="button" onClick={() => handleSaveType(type.id)} disabled={!canManage || isSaving} className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-white hover:bg-teal-800 disabled:opacity-50" aria-label={`Save ${type.name}`}><Save className="h-4 w-4" /></button><button type="button" onClick={() => handleArchiveType(type.id)} disabled={!canManage || isSaving} className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50" aria-label={`Archive ${type.name}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>
        </section>
      </div>

      <section className="clinic-panel rounded-3xl p-6 md:p-8">
        <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Stethoscope className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">Provider availability</h2><p className="mt-1 text-sm leading-6 text-slate-600">Override the clinic schedule for individual doctors when their working days differ.</p></div></div><Link to="/doctors" className="hidden items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex">Doctors<ExternalLink className="h-4 w-4" /></Link></div>
        <div className="mt-6 space-y-4">{doctors.length ? doctors.map((doctor) => <details key={doctor.id} className="rounded-2xl border border-slate-300 bg-slate-50 p-4"><summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">{doctor.name}<span className="ml-2 text-xs font-normal text-slate-500">Configure weekly availability</span></summary><div className="mt-4 overflow-x-auto rounded-xl border border-slate-300 bg-white"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left font-semibold text-slate-700">Day</th><th className="px-3 py-2 text-left font-semibold text-slate-700">Works</th><th className="px-3 py-2 text-left font-semibold text-slate-700">Hours</th></tr></thead><tbody className="divide-y divide-slate-200">{(providerDrafts[doctor.id] || []).map((day) => <tr key={day.weekday}><td className="px-3 py-2 font-medium text-slate-800">{WEEKDAYS.find((item) => item.weekday === day.weekday)?.label}</td><td className="px-3 py-2"><input type="checkbox" checked={day.isWorking} onChange={(event) => setProviderDrafts({ ...providerDrafts, [doctor.id]: providerDrafts[doctor.id].map((item) => item.weekday === day.weekday ? { ...item, isWorking: event.target.checked } : item) })} disabled={!canManage || isSaving} className="h-4 w-4 accent-teal-700" aria-label={`${doctor.name} works ${WEEKDAYS.find((item) => item.weekday === day.weekday)?.label}`} /></td><td className="px-3 py-2"><div className="flex min-w-64 gap-2"><input type="time" step="1800" className={inputClass} value={day.startTime} onChange={(event) => setProviderDrafts({ ...providerDrafts, [doctor.id]: providerDrafts[doctor.id].map((item) => item.weekday === day.weekday ? { ...item, startTime: event.target.value } : item) })} disabled={!canManage || isSaving || !day.isWorking} /><span className="self-center text-slate-400">to</span><input type="time" step="1800" className={inputClass} value={day.endTime} onChange={(event) => setProviderDrafts({ ...providerDrafts, [doctor.id]: providerDrafts[doctor.id].map((item) => item.weekday === day.weekday ? { ...item, endTime: event.target.value } : item) })} disabled={!canManage || isSaving || !day.isWorking} /></div></td></tr>)}</tbody></table></div><button type="button" onClick={() => handleSaveProviderSchedule(doctor.id)} disabled={!canManage || isSaving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />Save {doctor.name} schedule</button></details>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">Add a doctor first to configure provider availability.</p>}</div>
      </section>

      <section className="clinic-panel rounded-3xl p-6 md:p-8"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">Signed-in account</h2><p className="mt-1 text-sm leading-6 text-slate-600">{user?.displayName} · {user?.email} · <span className="capitalize">{user?.role}</span></p></div></div><div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800"><CheckCircle2 className="h-4 w-4" />Settings are protected by role</span><span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700"><Clock3 className="h-4 w-4" />Slot interval: 30 minutes</span></div></section>
    </div>
  );
}
