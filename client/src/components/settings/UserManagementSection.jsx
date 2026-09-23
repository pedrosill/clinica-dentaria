import { useCallback, useEffect, useState } from 'react';
import { Edit3, KeyRound, UserPlus, Users } from 'lucide-react';
import { createUser, getUsers, resetUserPassword, setUserActive, updateUser } from '../../services/users';
import { getDoctors } from '../../services/doctors';
import useLanguage from '../../context/useLanguage';
import SelectDropdown from '../ui/SelectDropdown';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100';

const initialForm = { email: '', displayName: '', role: 'receptionist', password: '', doctorId: '' };
const initialPasswordForm = { newPassword: '', confirmPassword: '' };

const roleLabels = {
  admin: 'Administrator',
  receptionist: 'Receptionist',
  dentist: 'Dentist',
};

function sortUsers(users) {
  return [...users].sort((a, b) => (
    Number(b.isActive) - Number(a.isActive) || a.displayName.localeCompare(b.displayName)
  ));
}

export default function UserManagementSection({ currentUserId }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordResetError, setPasswordResetError] = useState('');
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
      [event.target.name]: event.target.value,
      ...(event.target.name === 'role' && event.target.value !== 'dentist' ? { doctorId: '' } : {}),
    }));
  }

  function updateFormValue(name, value) {
    updateForm({ target: { name, value } });
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingUserId(null);
    setForm(initialForm);
  }

  function openCreateEditor() {
    setEditingUserId(null);
    setForm(initialForm);
    setIsEditorOpen(true);
    setError('');
    setSuccess('');
  }

  function openEditEditor(user) {
    setEditingUserId(user.id);
    setForm({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      password: '',
      doctorId: user.doctorProfile?.id ? String(user.doctorProfile.id) : '',
    });
    setIsEditorOpen(true);
    setError('');
    setSuccess('');
  }

  function openPasswordReset(user) {
    setPasswordResetUser(user);
    setPasswordForm(initialPasswordForm);
    setPasswordResetError('');
    setError('');
    setSuccess('');
  }

  function closePasswordReset() {
    setPasswordResetUser(null);
    setPasswordForm(initialPasswordForm);
    setPasswordResetError('');
  }

  function updatePasswordForm(event) {
    setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordResetError(t('New password and confirmation do not match.'));
      return;
    }

    setIsSaving(true);
    setPasswordResetError('');
    setError('');
    setSuccess('');
    try {
      await resetUserPassword(passwordResetUser.id, passwordForm.newPassword);
      const resetName = passwordResetUser.displayName;
      closePasswordReset();
      setSuccess(`${resetName}: ${t('User password updated successfully.')}`);
    } catch (requestError) {
      setPasswordResetError(t(requestError.message || 'Failed to reset user password'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingUserId) {
        const updatedUser = await updateUser(editingUserId, {
          email: form.email,
          displayName: form.displayName,
          role: form.role,
          doctorId: form.role === 'dentist' ? form.doctorId || null : null,
        });
        setUsers((current) => sortUsers(current.map((item) => item.id === updatedUser.id ? updatedUser : item)));
        closeEditor();
        setSuccess(t('User updated successfully.'));
      } else {
        const createdUser = await createUser(form);
        setUsers((current) => sortUsers([...current, createdUser]));
        setForm(initialForm);
        setSuccess(t('User created successfully.'));
      }
    } catch (requestError) {
      setError(requestError.message || (editingUserId ? t('Failed to update user') : t('Failed to create user')));
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
      setUsers((current) => sortUsers(current.map((item) => item.id === updatedUser.id ? updatedUser : item)));
      setSuccess(`${updatedUser.displayName} ${t('is now')} ${updatedUser.isActive ? t('Active').toLowerCase() : t('Inactive').toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError.message || t('Failed to update user status'));
    } finally {
      setIsSaving(false);
    }
  }

  const availableDoctors = doctors.filter((doctor) => !users.some((listedUser) => (
    listedUser.id !== editingUserId && String(listedUser.doctorProfile?.id) === String(doctor.id)
  )));

  return (
    <section className="clinic-panel rounded-2xl p-5 md:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Users className="h-5 w-5" /></div>
          <div><h2 className="text-xl font-semibold text-slate-900">{t('User management')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('Create staff accounts and control who can sign in to the clinic.')}</p></div>
        </div>
        <button type="button" onClick={isEditorOpen ? closeEditor : openCreateEditor} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4 text-teal-700" />{isEditorOpen ? t('Close editor') : t('Edit user management')}</button>
      </div>

      {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
      {success ? <div role="status" className="mt-5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</div> : null}

      {passwordResetUser ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="presentation">
        <form onSubmit={handlePasswordReset} autoComplete="off" role="dialog" aria-modal="true" aria-labelledby="reset-user-password-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h3 id="reset-user-password-title" className="text-lg font-semibold text-slate-900">{t('Reset user password')}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{passwordResetUser.displayName} · {passwordResetUser.email}</p></div>
            <button type="button" onClick={closePasswordReset} disabled={isSaving} className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label={t('Close')}>×</button>
          </div>
          {passwordResetError ? <div role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">{passwordResetError}</div> : null}
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">{t('The current password cannot be viewed. Set a new password instead.')}</p>
          <div className="mt-5 grid gap-3">
            <label className="space-y-2 text-sm font-medium text-slate-700">{t('New password')}<input required type="password" name="newPassword" autoFocus autoComplete="new-password" className={inputClass} value={passwordForm.newPassword} onChange={updatePasswordForm} disabled={isSaving} /></label>
            <label className="space-y-2 text-sm font-medium text-slate-700">{t('Confirm new password')}<input required type="password" name="confirmPassword" autoComplete="new-password" className={inputClass} value={passwordForm.confirmPassword} onChange={updatePasswordForm} disabled={isSaving} /></label>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={closePasswordReset} disabled={isSaving} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">{t('Cancel')}</button><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"><KeyRound className="h-4 w-4" />{isSaving ? t('Saving…') : t('Reset password')}</button></div>
        </form>
      </div> : null}

      {isEditorOpen ? <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 grid gap-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-4 md:grid-cols-2">
        <div className="md:col-span-2"><h3 className="text-base font-semibold text-slate-900">{editingUserId ? t('Edit user') : t('Create user')}</h3><p className="mt-1 text-xs text-slate-600">{editingUserId ? t('Update the account details and access role.') : t('Create a staff account with a temporary password.')}</p></div>
        <label className="space-y-2 text-sm font-medium text-slate-700">{t('Display name')}<input required name="displayName" autoComplete="off" className={inputClass} value={form.displayName} onChange={updateForm} disabled={isSaving} /></label>
        <label className="space-y-2 text-sm font-medium text-slate-700">{t('Email')}<input required type="email" name="email" autoComplete="off" className={inputClass} value={form.email} onChange={updateForm} disabled={isSaving} /></label>
        <SelectDropdown label={t('Role')} value={form.role} onChange={(value) => updateFormValue('role', value)} testId="select-role" disabled={isSaving || Number(editingUserId) === Number(currentUserId)} options={Object.entries(roleLabels).map(([value, label]) => ({ value, label: t(label) }))} />
        {form.role === 'dentist' ? <div><SelectDropdown label={t('Linked doctor')} value={form.doctorId} onChange={(value) => updateFormValue('doctorId', value)} testId="select-linked-doctor" disabled={isSaving || availableDoctors.length === 0} options={[{ value: '', label: t('Select doctor') }, ...availableDoctors.map((doctor) => ({ value: String(doctor.id), label: doctor.name }))]} />{availableDoctors.length === 0 ? <span className="block text-xs font-normal text-amber-700">{t('Create a doctor profile before creating a dentist account.')}</span> : null}</div> : null}
        {!editingUserId ? <label className="space-y-2 text-sm font-medium text-slate-700">{t('Temporary password')}<input required type="password" name="password" autoComplete="off" className={inputClass} value={form.password} onChange={updateForm} disabled={isSaving} /></label> : null}
        <div className="flex flex-wrap items-center gap-2 md:col-span-2"><button type="submit" disabled={isSaving} className="inline-flex w-fit items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"><UserPlus className="h-4 w-4" />{isSaving ? t('Saving…') : editingUserId ? t('Save changes') : t('Create user')}</button>{editingUserId ? <button type="button" onClick={closeEditor} disabled={isSaving} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">{t('Cancel')}</button> : null}</div>
      </form> : null}

      <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-300">
        {isLoading ? <p className="px-4 py-5 text-sm text-slate-600">{t('Loading users…')}</p> : users.length ? <table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Name')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Email')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Role')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Linked doctor')}</th><th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Status')}</th><th className="px-4 py-3 text-right font-semibold text-slate-700">{t('Action')}</th></tr></thead><tbody className="divide-y divide-slate-200">{users.map((listedUser) => { const isSelf = Number(listedUser.id) === Number(currentUserId); return <tr key={listedUser.id}><td className="px-4 py-3 font-medium text-slate-900">{listedUser.displayName}{isSelf ? <span className="ml-2 text-xs font-normal text-slate-500">{t('(you)')}</span> : null}</td><td className="px-4 py-3 text-slate-600">{listedUser.email}</td><td className="px-4 py-3 capitalize text-slate-600">{roleLabels[listedUser.role] ? t(roleLabels[listedUser.role]) : listedUser.role}</td><td className="px-4 py-3 text-slate-600">{listedUser.doctorProfile?.name || t('Not linked')}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${listedUser.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{listedUser.isActive ? t('Active') : t('Inactive')}</span></td><td className="px-4 py-3 text-right"><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => openPasswordReset(listedUser)} disabled={isSaving} className="inline-flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"><KeyRound className="h-3.5 w-3.5" />{t('Reset password')}</button><button type="button" onClick={() => openEditEditor(listedUser)} disabled={isSaving} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{t('Edit')}</button><button type="button" onClick={() => handleToggleUser(listedUser)} disabled={isSaving || isSelf} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" title={isSelf ? t('You cannot deactivate your own account') : undefined}>{listedUser.isActive ? (isSelf ? t('Cannot deactivate') : t('Deactivate')) : t('Activate')}</button></div></td></tr>; })}</tbody></table> : <p className="px-4 py-5 text-sm text-slate-500">{t('No users found.')}</p>}
      </div>
      <p className="mt-3 text-xs text-slate-500">{t('Your own active account cannot be deactivated here.')} {t('Passwords are never shown; use Reset password to set a new one.')}</p>
    </section>
  );
}
