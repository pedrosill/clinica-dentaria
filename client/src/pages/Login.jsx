import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useLanguage from '../context/useLanguage';
import { getLoginUsers } from '../services/auth';

const roleLabels = {
  admin: 'Administrator',
  receptionist: 'Receptionist',
  dentist: 'Dentist',
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getLoginUsers()
      .then((data) => {
        if (!isMounted) return;
        const availableUsers = Array.isArray(data.users) ? data.users : [];
        setUsers(availableUsers);
        if (availableUsers.length === 1) setUserId(String(availableUsers[0].id));
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError.message || t('Unable to load users'));
      })
      .finally(() => {
        if (isMounted) setIsLoadingUsers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const from = location.state?.from;
    const destination = `${from?.pathname || '/'}${from?.search || ''}`;
    navigate(destination, { replace: true });
  }, [isAuthenticated, location, navigate]);

  if (isAuthenticated) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await login({ userId, password });
      const from = location.state?.from;
      const destination = `${from?.pathname || '/'}${from?.search || ''}`;
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message || t('Unable to sign in'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-200/70 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-teal-800">{t('Clinic workspace')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">DentalPro</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t('Sign in to manage the clinic safely.')}</p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-user" className="text-sm font-medium text-slate-800">
              {t('User')}
            </label>
            <select
              id="login-user"
              data-testid="login-user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              autoComplete="off"
              required
              disabled={isLoadingUsers || isSubmitting || users.length === 0}
            >
              <option value="">{isLoadingUsers ? t('Loading users…') : t('Select user')}</option>
              {users.map((loginUser) => (
                <option key={loginUser.id} value={loginUser.id}>
                  {loginUser.displayName} · {t(roleLabels[loginUser.role] || loginUser.role)}
                </option>
              ))}
            </select>
            {!isLoadingUsers && users.length === 0 ? <p className="text-xs font-normal text-red-700">{t('No active users available.')}</p> : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-medium text-slate-800">
              {t('Password')}
            </label>
            <input
              id="login-password"
              data-testid="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              required
              disabled={isLoadingUsers || users.length === 0}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={isSubmitting || isLoadingUsers || users.length === 0}
            className="w-full rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? t('Signing in…') : t('Sign in')}
          </button>
        </form>
      </section>
    </main>
  );
}
