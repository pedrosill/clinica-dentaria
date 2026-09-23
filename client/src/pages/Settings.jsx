import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Plus,
  Save,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useLanguage from '../context/useLanguage';
import { LANGUAGE_OPTIONS } from '../context/languageConstants';
import { getDoctors } from '../services/doctors';
import { changePassword } from '../services/auth';
import UserManagementSection from '../components/settings/UserManagementSection';
import ComplianceSection from '../components/settings/ComplianceSection';
import SelectDropdown from '../components/ui/SelectDropdown';
import DatePicker from '../components/ui/DatePicker';
import { TIME_OPTIONS } from '../constants/agendaConstants';
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

const TIME_SELECT_OPTIONS = TIME_OPTIONS.map((time) => ({ value: time, label: time }));

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
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const canManage = user?.role === 'admin';
  const [settings, setSettings] = useState(null);
  const [scheduleDraft, setScheduleDraft] = useState([]);
  const [clinicForm, setClinicForm] = useState({ clinicName: '', timezone: '', language });
  const [doctors, setDoctors] = useState([]);
  const [providerDrafts, setProviderDrafts] = useState({});
  const [closureForm, setClosureForm] = useState({ date: '', label: '' });
  const [typeForm, setTypeForm] = useState({ name: '', duration: '30' });
  const [typeDrafts, setTypeDrafts] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const initialSettingsSection = new URLSearchParams(location.search).get('section');
  const [activeSettingsSection, setActiveSettingsSection] = useState(
    ['clinic', 'scheduling', 'team', 'account', 'compliance'].includes(initialSettingsSection)
      ? initialSettingsSection
      : 'clinic'
  );
  const [editingSettingsSection, setEditingSettingsSection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const settingsRequestRef = useRef(0);
  const hasUnsavedLanguageChange = useRef(false);

  const loadSettings = useCallback(async () => {
    const requestId = settingsRequestRef.current + 1;
    settingsRequestRef.current = requestId;
    setIsLoading(true);
    setError('');

    try {
      const [settingsData, doctorsData] = await Promise.all([getClinicSettings(), getDoctors()]);
      if (requestId !== settingsRequestRef.current) return;
      setSettings(settingsData);
      setScheduleDraft(buildScheduleDraft(settingsData.schedules));
      setClinicForm((current) => ({
        clinicName: settingsData.clinicName,
        timezone: settingsData.timezone,
        language: hasUnsavedLanguageChange.current ? current.language : settingsData.language || 'en',
      }));
      if (!hasUnsavedLanguageChange.current) {
        setLanguage(settingsData.language || 'en');
      }
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
      if (requestId !== settingsRequestRef.current) return;
      setError(requestError.message || t('Failed to load clinic settings'));
    } finally {
      if (requestId === settingsRequestRef.current) setIsLoading(false);
    }
  }, [setLanguage, t]);

  useEffect(() => {
    // Loading external settings is intentionally initiated when this page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, [loadSettings]);

  const activeTypes = useMemo(
    () => settings?.appointmentTypes?.filter((type) => type.isActive !== false) || [],
    [settings]
  );

  function showSuccess(message) {
    setError('');
    setSuccess(message);
  }

  function toggleSettingsEditor(section) {
    setEditingSettingsSection((current) => (current === section ? null : section));
    setError('');
    setSuccess('');
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
      const selectedLanguage = event.currentTarget.elements.language?.value || clinicForm.language;
      const updated = await updateClinicSettings({
        ...clinicForm,
        language: selectedLanguage,
        slotIntervalMinutes: 30,
        schedules: scheduleDraft,
      });
      setSettings(updated);
      setScheduleDraft(buildScheduleDraft(updated.schedules));
      hasUnsavedLanguageChange.current = false;
      setClinicForm((current) => ({
        ...current,
        language: updated.language || selectedLanguage,
      }));
      setLanguage(updated.language || selectedLanguage);
      setEditingSettingsSection(null);
      showSuccess(t('Clinic schedule saved. Availability now uses these hours.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to save clinic settings'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSuccess('');
      setError(t('New password and confirmation do not match.'));
      return;
    }

    try {
      setIsPasswordSaving(true);
      setError('');
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess(t('Password changed successfully. Other signed-in sessions were signed out.'));
    } catch (requestError) {
      setSuccess('');
      setError(requestError.message || t('Failed to change password'));
    } finally {
      setIsPasswordSaving(false);
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
      showSuccess(t('Closure added. No appointments can be booked on that date.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to add closure'));
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
      showSuccess(t('Closure removed.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to remove closure'));
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
      showSuccess(t('Appointment type added.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to add appointment type'));
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
      showSuccess(t('Appointment type saved.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to save appointment type'));
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
      showSuccess(t('Appointment type archived. Existing appointments are unchanged.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to archive appointment type'));
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
      showSuccess(t('Provider schedule saved.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to save provider schedule'));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="w-full rounded-3xl border border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm">{t('Loading clinic settings…')}</div>;
  }

  return (
    <div className="w-full space-y-6">
      <section className="clinic-panel rounded-3xl p-6 md:p-8">
        <p className="text-sm font-medium text-teal-700">{t('Settings')}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{t('Clinic setup')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {t('Configure the operational rules used by the agenda, new appointments, and rescheduling.')}
        </p>
      </section>

      {error ? <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</div> : null}
      {!canManage ? <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{t('Only administrators can change clinic settings.')}</div> : null}

      <nav className="flex flex-wrap gap-2 border-b border-slate-300 pb-3" role="tablist" aria-label={t('Settings areas')}>
        {[
          ['clinic', 'Clinic'],
          ['scheduling', 'Scheduling'],
          ['team', 'Team'],
          ['account', 'Account'],
          ['compliance', 'Compliance'],
        ].filter(([value]) => value !== 'team' || user?.role === 'admin').map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeSettingsSection === value}
            onClick={() => setActiveSettingsSection(value)}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeSettingsSection === value ? 'bg-teal-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            {t(label)}
          </button>
        ))}
      </nav>

      {activeSettingsSection === 'team' && canManage ? <UserManagementSection currentUserId={user?.id} /> : null}
      {activeSettingsSection === 'compliance' ? <ComplianceSection /> : null}

      {activeSettingsSection === 'clinic' ? <section className="clinic-panel rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><CalendarClock className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">{t('Practice schedule')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('These hours control every available start time in the booking engine.')}</p></div></div>
          {canManage ? <button type="button" onClick={() => toggleSettingsEditor('clinic')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4 text-teal-700" />{editingSettingsSection === 'clinic' ? t('Close editor') : t('Edit clinic settings')}</button> : null}
        </div>
        {editingSettingsSection === 'clinic' && canManage ? <form onSubmit={handleSaveClinicSettings} autoComplete="off" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2"><label className="space-y-2 text-sm font-medium text-slate-700">{t('Clinic name')}<input className={inputClass} value={clinicForm.clinicName} onChange={(event) => setClinicForm({ ...clinicForm, clinicName: event.target.value })} /></label><label className="space-y-2 text-sm font-medium text-slate-700">{t('Timezone')}<input className={inputClass} value={clinicForm.timezone} onChange={(event) => setClinicForm({ ...clinicForm, timezone: event.target.value })} /></label><SelectDropdown label={t('Language')} testId="language-select" value={clinicForm.language} onChange={(nextLanguage) => { hasUnsavedLanguageChange.current = true; setClinicForm((current) => ({ ...current, language: nextLanguage })); setLanguage(nextLanguage); }} options={LANGUAGE_OPTIONS.map((option) => ({ value: option.value, label: t(option.label) }))} /></div>
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Day')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Open')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Hours')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Break')}</th></tr></thead><tbody className="divide-y divide-slate-200 bg-white">{scheduleDraft.map((day) => { const label = WEEKDAYS.find((item) => item.weekday === day.weekday)?.label; return <tr key={day.weekday}><td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{t(label)}</td><td className="px-4 py-3"><input type="checkbox" checked={day.isOpen} onChange={(event) => updateDay(day.weekday, { isOpen: event.target.checked })} className="h-4 w-4 accent-teal-700" aria-label={`${t(label)} ${t('Open')}`} /></td><td className="px-4 py-3"><div className="flex min-w-64 gap-2"><SelectDropdown label={null} value={day.startTime} onChange={(value) => updateDay(day.weekday, { startTime: value })} options={TIME_SELECT_OPTIONS} disabled={!day.isOpen} /><span className="self-center text-slate-400">{t('to')}</span><SelectDropdown label={null} value={day.endTime} onChange={(value) => updateDay(day.weekday, { endTime: value })} options={TIME_SELECT_OPTIONS} disabled={!day.isOpen} /></div></td><td className="px-4 py-3"><div className="flex min-w-64 gap-2"><SelectDropdown label={null} value={day.breakStart} onChange={(value) => updateDay(day.weekday, { breakStart: value })} options={[{ value: '', label: t('Not set') }, ...TIME_SELECT_OPTIONS]} disabled={!day.isOpen} /><span className="self-center text-slate-400">{t('to')}</span><SelectDropdown label={null} value={day.breakEnd} onChange={(value) => updateDay(day.weekday, { breakEnd: value })} options={[{ value: '', label: t('Not set') }, ...TIME_SELECT_OPTIONS]} disabled={!day.isOpen} /></div></td></tr>; })}</tbody></table></div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{t('Appointment grid is fixed at 30 minutes. The latest valid start is calculated from the closing time and duration.')}</p><button data-testid="save-clinic-settings" type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{t('Save schedule')}</button></div>
        </form> : <div className="mt-5 grid gap-4 text-sm md:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('Clinic name')}</p><p className="mt-1 font-medium text-slate-800">{clinicForm.clinicName}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('Timezone')}</p><p className="mt-1 font-medium text-slate-800">{clinicForm.timezone}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('Language')}</p><p className="mt-1 font-medium text-slate-800">{t(LANGUAGE_OPTIONS.find((option) => option.value === clinicForm.language)?.label || clinicForm.language)}</p></div><div className="md:col-span-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t('Weekly hours')}</p><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{scheduleDraft.map((day) => { const label = WEEKDAYS.find((item) => item.weekday === day.weekday)?.label; return <div key={day.weekday} className="flex items-center justify-between border-b border-slate-100 pb-2"><span className="font-medium text-slate-700">{t(label)}</span><span className="text-slate-600">{day.isOpen ? `${day.startTime}–${day.endTime}` : t('Closed')}</span></div>; })}</div></div></div>}
      </section> : null}

      {activeSettingsSection === 'scheduling' ? <>
      <div className="grid gap-6 xl:grid-cols-2">
         <section className="clinic-panel rounded-2xl p-5 md:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Clock3 className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">{t('Closures and holidays')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('Block a specific date without changing the weekly schedule.')}</p></div></div>{canManage ? <button type="button" onClick={() => toggleSettingsEditor('closures')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4 text-teal-700" />{editingSettingsSection === 'closures' ? t('Close editor') : t('Edit closures')}</button> : null}</div>
          {editingSettingsSection === 'closures' && canManage ? <form onSubmit={handleAddClosure} autoComplete="off" className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]"><DatePicker label={t('Date')} value={closureForm.date} onChange={(value) => setClosureForm({ ...closureForm, date: value })} disabled={isSaving} /><input required placeholder={t('Reason, e.g. Christmas')} className={inputClass} value={closureForm.label} onChange={(event) => setClosureForm({ ...closureForm, label: event.target.value })} disabled={isSaving} /><button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Plus className="h-4 w-4" />{t('Add')}</button></form> : null}
          <div className="mt-5 space-y-2">{settings?.closures?.length ? settings.closures.map((closure) => <div key={closure.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><div><span className="font-semibold text-slate-900">{closure.date}</span><span className="ml-2 text-slate-600">{closure.label}</span></div>{editingSettingsSection === 'closures' ? <button type="button" onClick={() => handleDeleteClosure(closure.id)} disabled={isSaving} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-700 disabled:opacity-50" aria-label={`${t('Remove')} ${closure.label}`}><Trash2 className="h-4 w-4" /></button> : null}</div>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">{t('No special closures configured.')}</p>}</div>
        </section>

         <section className="clinic-panel rounded-2xl p-5 md:p-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Stethoscope className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">{t('Appointment types')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('Templates set the default duration used by new bookings.')}</p></div></div>{canManage ? <button type="button" onClick={() => toggleSettingsEditor('types')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4 text-teal-700" />{editingSettingsSection === 'types' ? t('Close editor') : t('Edit appointment types')}</button> : null}</div>
          {editingSettingsSection === 'types' && canManage ? <form onSubmit={handleAddType} autoComplete="off" className="mt-6 grid gap-3 sm:grid-cols-[1fr_110px_auto]"><input required placeholder={t('Appointment type')} className={inputClass} value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} disabled={isSaving} /><SelectDropdown label={null} value={typeForm.duration} onChange={(value) => setTypeForm({ ...typeForm, duration: value })} options={[30, 60, 90, 120].map((duration) => ({ value: String(duration), label: `${duration} ${t('min')}` }))} disabled={isSaving} /><button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Plus className="h-4 w-4" />{t('Add')}</button></form> : null}
          <div className="mt-5 space-y-2">{activeTypes.map((type) => editingSettingsSection === 'types' ? <div key={type.id} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_150px_auto_auto]"><input className={inputClass} value={typeDrafts[type.id]?.name || ''} onChange={(event) => setTypeDrafts({ ...typeDrafts, [type.id]: { ...typeDrafts[type.id], name: event.target.value } })} disabled={isSaving} /><SelectDropdown label={null} value={typeDrafts[type.id]?.duration || String(type.duration)} onChange={(value) => setTypeDrafts({ ...typeDrafts, [type.id]: { ...typeDrafts[type.id], duration: value } })} options={[30, 60, 90, 120].map((duration) => ({ value: String(duration), label: `${duration} ${t('min')}` }))} disabled={isSaving} /><button type="button" onClick={() => handleSaveType(type.id)} disabled={isSaving} className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-3 py-2 text-white hover:bg-teal-800 disabled:opacity-50" aria-label={`${t('Save')} ${type.name}`}><Save className="h-4 w-4" /></button><button type="button" onClick={() => handleArchiveType(type.id)} disabled={isSaving} className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50" aria-label={`${t('Archive')} ${type.name}`}><Trash2 className="h-4 w-4" /></button></div> : <div key={type.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><span className="font-medium text-slate-800">{type.name}</span><span className="text-slate-600">{type.duration} {t('min')}</span></div>)}</div>
        </section>
      </div>

      <section className="clinic-panel rounded-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><Stethoscope className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">{t('Provider availability')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('Override the clinic schedule for individual doctors when their working days differ.')}</p></div></div><Link to="/doctors" className="hidden items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex">{t('Doctors')}<ExternalLink className="h-4 w-4" /></Link></div>
        <div className="mt-6 space-y-4">{doctors.length ? doctors.map((doctor) => <details key={doctor.id} className="rounded-2xl border border-slate-300 bg-slate-50 p-4"><summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">{doctor.name}<span className="ml-2 text-xs font-normal text-slate-500">{t('Edit provider schedule')}</span></summary><div className="mt-4 overflow-x-auto rounded-xl border border-slate-300 bg-white"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left font-semibold text-slate-700">{t('Day')}</th><th className="px-3 py-2 text-left font-semibold text-slate-700">{t('Works')}</th><th className="px-3 py-2 text-left font-semibold text-slate-700">{t('Hours')}</th></tr></thead><tbody className="divide-y divide-slate-200">{(providerDrafts[doctor.id] || []).map((day) => <tr key={day.weekday}><td className="px-3 py-2 font-medium text-slate-800">{t(WEEKDAYS.find((item) => item.weekday === day.weekday)?.label)}</td><td className="px-3 py-2"><input type="checkbox" checked={day.isWorking} onChange={(event) => setProviderDrafts({ ...providerDrafts, [doctor.id]: providerDrafts[doctor.id].map((item) => item.weekday === day.weekday ? { ...item, isWorking: event.target.checked } : item) })} disabled={!canManage || isSaving} className="h-4 w-4 accent-teal-700" aria-label={`${doctor.name} ${t('works on')} ${t(WEEKDAYS.find((item) => item.weekday === day.weekday)?.label)}`} /></td><td className="px-3 py-2"><div className="flex min-w-64 gap-2"><SelectDropdown label={null} value={day.startTime} onChange={(value) => setProviderDrafts({ ...providerDrafts, [doctor.id]: providerDrafts[doctor.id].map((item) => item.weekday === day.weekday ? { ...item, startTime: value } : item) })} options={TIME_SELECT_OPTIONS} disabled={!canManage || isSaving || !day.isWorking} /><span className="self-center text-slate-400">{t('to')}</span><SelectDropdown label={null} value={day.endTime} onChange={(value) => setProviderDrafts({ ...providerDrafts, [doctor.id]: providerDrafts[doctor.id].map((item) => item.weekday === day.weekday ? { ...item, endTime: value } : item) })} options={TIME_SELECT_OPTIONS} disabled={!canManage || isSaving || !day.isWorking} /></div></td></tr>)}</tbody></table></div><button type="button" onClick={() => handleSaveProviderSchedule(doctor.id)} disabled={!canManage || isSaving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"><Save className="h-4 w-4" />{t('Save provider schedule for')} {doctor.name}</button></details>) : <p className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">{t('Add a doctor first to configure provider availability.')}</p>}</div>
      </section>
      </> : null}

      {activeSettingsSection === 'account' ? <section className="clinic-panel rounded-2xl p-5 md:p-6"><div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold text-slate-900">{t('Signed-in account')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{user?.displayName} · {user?.email} · <span className="capitalize">{user?.role}</span></p></div></div><button type="button" onClick={() => toggleSettingsEditor('account')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4 text-teal-700" />{editingSettingsSection === 'account' ? t('Close editor') : t('Edit account')}</button></div>{editingSettingsSection === 'account' ? <form onSubmit={handleChangePassword} autoComplete="off" className="mt-6 grid max-w-xl gap-3"><label className="text-sm font-medium text-slate-700">{t('Current password')}<input required type="password" autoComplete="off" className={inputClass} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} disabled={isPasswordSaving} /></label><label className="text-sm font-medium text-slate-700">{t('New password')}<input required type="password" autoComplete="off" className={inputClass} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} disabled={isPasswordSaving} /></label><label className="text-sm font-medium text-slate-700">{t('Confirm new password')}<input required type="password" autoComplete="off" className={inputClass} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} disabled={isPasswordSaving} /></label><button type="submit" disabled={isPasswordSaving} className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60">{isPasswordSaving ? t('Changing password…') : t('Change password')}</button></form> : <p className="mt-5 text-sm text-slate-600">{t('Password changes are available when you choose to edit this section.')}</p>}<div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800"><CheckCircle2 className="h-4 w-4" />{t('Other sessions are revoked after a change')}</span><span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-700"><Clock3 className="h-4 w-4" />{t('Slot interval: 30 minutes')}</span></div></section> : null}
    </div>
  );
}
