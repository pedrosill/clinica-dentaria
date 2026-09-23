import { Check, ChevronDown, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useLanguage from '../context/useLanguage';
import { getLoginUsers, requestPasswordRecovery, resetPassword } from '../services/auth';

const roleLabels = { admin: 'Administrator', receptionist: 'Receptionist', dentist: 'Dentist' };

function getInitials(displayName) {
  return String(displayName || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

function destinationFor(location) {
  const from = location.state?.from;
  return `${from?.pathname || '/'}${from?.search || ''}`;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyMfa, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const initialToken = new URLSearchParams(location.search).get('token') || '';
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryUrl, setRecoveryUrl] = useState('');
  const [mode, setMode] = useState(initialToken ? 'recovery-reset' : 'credentials');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userPickerRef = useRef(null);

  const selectedUser = users.find((loginUser) => String(loginUser.id) === String(userId));

  useEffect(() => {
    let isMounted = true;
    getLoginUsers()
      .then((data) => {
        if (!isMounted) return;
        const availableUsers = Array.isArray(data.users) ? data.users : [];
        setUsers(availableUsers);
        if (availableUsers.length === 1) setUserId(String(availableUsers[0].id));
      })
      .catch((loadError) => { if (isMounted) setError(loadError.message || t('Unable to load users')); })
      .finally(() => { if (isMounted) setIsLoadingUsers(false); });
    return () => { isMounted = false; };
  }, [t]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!userPickerRef.current?.contains(event.target)) setIsUserMenuOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate(destinationFor(location), { replace: true });
  }, [isAuthenticated, location, navigate]);

  if (isAuthenticated) return null;

  function clearFeedback() {
    setError('');
    setNotice('');
  }

  function showCredentials() {
    clearFeedback();
    setRecoveryUrl('');
    setMode('credentials');
    setMfaCode('');
    setChallengeToken('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    clearFeedback();
    try {
      if (mode === 'mfa') {
        await verifyMfa({ challengeToken, code: mfaCode });
      } else if (mode === 'recovery-request') {
        const data = await requestPasswordRecovery(recoveryEmail);
        setNotice(t(data.message || 'If an account matches that email, recovery instructions will be sent shortly.'));
        setRecoveryUrl(data.recoveryUrl || '');
      } else if (mode === 'recovery-reset') {
        if (newPassword !== confirmPassword) throw new Error(t('New password and confirmation do not match.'));
        await resetPassword({ token: recoveryToken, newPassword });
        setNotice(t('Password reset successfully. You can now sign in.'));
        setNewPassword('');
        setConfirmPassword('');
        setRecoveryToken('');
        setRecoveryUrl('');
        navigate('/login', { replace: true });
        setMode('credentials');
      } else {
        if (!userId) throw new Error(t('Select your account before signing in.'));
        const data = await login({ userId, password });
        if (data.mfaRequired) {
          setChallengeToken(data.challengeToken);
          setMode('mfa');
          setPassword('');
        }
      }
    } catch (submitError) {
      setError(t(submitError.message || 'Unable to complete the request'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCredentialsMode = mode === 'credentials';
  const isMfaMode = mode === 'mfa';
  const isRecoveryRequestMode = mode === 'recovery-request';
  const isRecoveryResetMode = mode === 'recovery-reset';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-200/70 px-4 py-8">
      <section className="clinic-panel w-full max-w-md rounded-2xl p-6 md:p-8">
        <p className="text-sm font-semibold text-teal-800">{t('Clinic workspace')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">DentalPro</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{isMfaMode ? t('Enter the six-digit code from your authenticator app.') : t('Sign in to manage the clinic safely.')}</p>
        {error ? <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}
        {notice ? <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{notice}</div> : null}
        {recoveryUrl ? <div className="mt-4 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900"><p className="font-semibold">{t('Development recovery link')}</p><a href={recoveryUrl} className="mt-2 block break-all font-medium underline decoration-sky-400 underline-offset-2 hover:text-sky-950">{t('Open recovery link')}</a></div> : null}

        <form onSubmit={handleSubmit} autoComplete="on" className="mt-6 space-y-5">
          {isCredentialsMode ? (
            <>
              <div className="space-y-2">
                <label htmlFor="login-user" className="text-sm font-medium text-slate-800">{t('Choose your account')}</label>
                <div ref={userPickerRef} className="relative">
                  <button type="button" id="login-user" data-testid="login-user" aria-haspopup="listbox" aria-expanded={isUserMenuOpen} aria-required="true" disabled={isLoadingUsers || isSubmitting || users.length === 0} onClick={() => setIsUserMenuOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-left shadow-sm transition hover:bg-white focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-70">
                    <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-sm font-semibold text-teal-800">{selectedUser ? getInitials(selectedUser.displayName) : <UserRound className="h-5 w-5" />}</span><span className="min-w-0"><span className={`block truncate text-sm font-semibold ${selectedUser ? 'text-slate-900' : 'text-slate-500'}`}>{selectedUser?.displayName || (isLoadingUsers ? t('Loading users…') : t('Select your account'))}</span><span className="block truncate text-xs text-slate-500">{selectedUser ? t(roleLabels[selectedUser.role] || selectedUser.role) : t('Choose the account for this session')}</span></span></span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isUserMenuOpen ? <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg" role="listbox" aria-label={t('Choose your account')}>
                    {users.map((loginUser) => {
                      const isSelected = String(loginUser.id) === String(userId);
                      return <button key={loginUser.id} type="button" role="option" aria-selected={isSelected} data-testid={`login-user-option-${loginUser.id}`} onClick={() => { setUserId(String(loginUser.id)); setIsUserMenuOpen(false); clearFeedback(); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 ${isSelected ? 'bg-teal-50' : ''}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-700">{getInitials(loginUser.displayName)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{loginUser.displayName}</span><span className="block truncate text-xs text-slate-500">{t(roleLabels[loginUser.role] || loginUser.role)}</span></span>{isSelected ? <Check className="h-5 w-5 shrink-0 text-teal-700" /> : null}</button>;
                    })}
                  </div> : null}
                </div>
                <input type="hidden" name="userId" value={userId} />
                {!isLoadingUsers && users.length === 0 ? <p className="text-xs font-normal text-red-700">{t('No active users available.')}</p> : null}
              </div>
              <div className="space-y-2"><label htmlFor="login-password" className="text-sm font-medium text-slate-800">{t('Password')}</label><input id="login-password" data-testid="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required disabled={isLoadingUsers || users.length === 0} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-70" /></div>
            </>
          ) : null}

          {isMfaMode ? <div className="space-y-2"><label htmlFor="mfa-code" className="text-sm font-medium text-slate-800">{t('Authenticator code')}</label><input id="mfa-code" data-testid="mfa-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} type="text" value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" required className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-lg tracking-[0.35em] text-slate-800 shadow-sm transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100" /></div> : null}
          {isRecoveryRequestMode ? <div className="space-y-2"><label htmlFor="recovery-email" className="text-sm font-medium text-slate-800">{t('Account email')}</label><input id="recovery-email" type="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} autoComplete="email" required className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100" /><p className="text-xs leading-5 text-slate-500">{t('If the account exists, recovery instructions will be sent to that email.')}</p></div> : null}
          {isRecoveryResetMode ? <><div className="space-y-2"><label htmlFor="recovery-token" className="text-sm font-medium text-slate-800">{t('Recovery token')}</label><input id="recovery-token" type="text" value={recoveryToken} onChange={(event) => setRecoveryToken(event.target.value)} required className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm" /></div><div className="space-y-2"><label htmlFor="recovery-password" className="text-sm font-medium text-slate-800">{t('New password')}</label><input id="recovery-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm" /></div><div className="space-y-2"><label htmlFor="recovery-password-confirm" className="text-sm font-medium text-slate-800">{t('Confirm new password')}</label><input id="recovery-password-confirm" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm" /></div></> : null}

          <button type="submit" data-testid="login-submit" disabled={isSubmitting || (isCredentialsMode && (isLoadingUsers || users.length === 0))} className="w-full rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70">{isSubmitting ? t('Working…') : isMfaMode ? t('Verify code') : isRecoveryRequestMode ? t('Send recovery instructions') : isRecoveryResetMode ? t('Reset password') : t('Sign in')}</button>
        </form>

        <div className="mt-5 flex justify-between text-sm">
          {isCredentialsMode ? <button type="button" onClick={() => { clearFeedback(); setMode('recovery-request'); }} className="font-medium text-teal-800 hover:text-teal-950">{t('Forgot password?')}</button> : <button type="button" onClick={showCredentials} className="font-medium text-teal-800 hover:text-teal-950">{t('Back to sign in')}</button>}
          {isMfaMode ? <button type="button" onClick={showCredentials} className="font-medium text-slate-600 hover:text-slate-900">{t('Start over')}</button> : null}
        </div>
      </section>
    </main>
  );
}
