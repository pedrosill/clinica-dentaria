import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { createUser, getUsers, setUserActive } from '../../services/users';
import { getDoctors } from '../../services/doctors';
import useLanguage from '../../context/useLanguage';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100';

const initialForm = { email: '', displayName: '', role: 'receptionist', password: '', doctorId: '' };

const roleLabels = {
  admin: 'Administrator',
  receptionist: 'Receptionist',
  dentist: 'Dentist',
};

export default function UserManagementSection({ currentUserId }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setUsers(await getUsers());
    } catch (requestError) {
      setError(requestError.message || t('Failed to load users'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // Loading users is intentionally initiated when this section mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadUsers(), getDoctors().then(setDoctors).catch(() => setDoctors([]))]);
  }, [loadUsers]);

  function updateForm(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.name === 'role' && event.target.value !== 'dentist'
        ? event.target.value
        : event.target.value,
      ...(event.target.name === 'role' && event.target.value !== 'dentist' ? { doctorId: '' } : {}),
    }));
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const createdUser = await createUser(form);
      setUsers((current) => [...current, createdUser].sort((a, b) => (
        Number(b.isActive) - Number(a.isActive) || a.displayName.localeCompare(b.displayName)
      )));
      setForm(initialForm);
      setSuccess(t('User created successfully.'));
    } catch (requestError) {
      setError(requestError.message || t('Failed to create user'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleUser(user) {
    if (Number(user.id) === Number(currentUserId) && user.isActive) return;

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const updatedUser = await setUserActive(user.id, !user.isActive);
      setUsers((current) => current.map((item) => item.id === updatedUser.id ? updatedUser : item));
      setSuccess(`${updatedUser.displayName} ${t('is now')} ${updatedUser.isActive ? t('Active').toLowerCase() : t('Inactive').toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError.message || t('Failed to update user status'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="clinic-panel rounded-3xl p-6 md:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Users className="h-5 w-5" /></div>
        <div><h2 className="text-xl font-semibold text-slate-900">{t('User management')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('Create staff accounts and control who can sign in to the clinic.')}</p></div>
      </div>

      {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
      {success ? <div role="status" className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</div> : null}

      <form onSubmit={handleCreateUser} autoComplete="off" className="mt-6 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">{t('Display name')}<input required name="displayName" autoComplete="off" className={inputClass} value={form.displayName} onChange={updateForm} disabled={isSaving} /></label>
        <label className="space-y-2 text-sm font-medium text-slate-700">{t('Email')}<input required type="email" name="email" autoComplete="off" className={inputClass} value={form.email} onChange={updateForm} disabled={isSaving} /></label>
        <label className="space-y-2 text-sm font-medium text-slate-700">{t('Role')}<select name="role" className={inputClass} value={form.role} onChange={updateForm} disabled={isSaving}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label>
        {form.role === 'dentist' ? <label className="space-y-2 text-sm font-medium text-slate-700">{t('Linked doctor')}<select required name="doctorId" className={inputClass} value={form.doctorId} onChange={updateForm} disabled={isSaving || doctors.length === 0}><option value="">{t('Select doctor')}</option>{doctors.filter((doctor) => !users.some((listedUser) => String(listedUser.doctorProfile?.id) === String(doctor.id))).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select>{doctors.length === 0 ? <span className="block text-xs font-normal text-amber-700">{t('Create a doctor profile before creating a dentist account.')}</span> : null}</label> : null}
        <label className="space-y-2 text-sm font-medium text-slate-700">{t('Temporary password')}<input required minLength={12} type="password" name="password" autoComplete="off" className={inputClass} value={form.password} onChange={updateForm} disabled={isSaving} /><span className="block text-xs font-normal text-slate-500">{t('Use at least 12 characters.')}</span></label>
        <button type="submit" disabled={isSaving} className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"><UserPlus className="h-4 w-4" />{isSaving ? t('Saving…') : t('Create user')}</button>
      </form>

      <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-300">
        {isLoading ? <p className="px-4 py-5 text-sm text-slate-600">{t('Loading users…')}</p> : users.length ? <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Name')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Email')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Role')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Linked doctor')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Status')}</th><th className="px-4 py-3 text-right font-semibold text-slate-700">{t('Action')}</th></tr></thead><tbody className="divide-y divide-slate-200">{users.map((listedUser) => { const isSelf = Number(listedUser.id) === Number(currentUserId); return <tr key={listedUser.id}><td className="px-4 py-3 font-medium text-slate-900">{listedUser.displayName}{isSelf ? <span className="ml-2 text-xs font-normal text-slate-500">{t('(you)')}</span> : null}</td><td className="px-4 py-3 text-slate-600">{listedUser.email}</td><td className="px-4 py-3 capitalize text-slate-600">{roleLabels[listedUser.role] ? t(roleLabels[listedUser.role]) : listedUser.role}</td><td className="px-4 py-3 text-slate-600">{listedUser.doctorProfile?.name || t('Not linked')}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listedUser.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{listedUser.isActive ? t('Active') : t('Inactive')}</span></td><td className="px-4 py-3 text-right"><button type="button" onClick={() => handleToggleUser(listedUser)} disabled={isSaving || isSelf} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" title={isSelf ? t('You cannot deactivate your own account') : undefined}>{listedUser.isActive ? (isSelf ? t('Cannot deactivate') : t('Deactivate')) : t('Activate')}</button></td></tr>; })}</tbody></table> : <p className="px-4 py-5 text-sm text-slate-500">{t('No users found.')}</p>}
      </div>
      <p className="mt-3 text-xs text-slate-500">{t('Your own active account cannot be deactivated here.')}</p>
    </section>
  );
}
