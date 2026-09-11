import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useLanguage from '../context/useLanguage';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await login({ email, password });
      const from = location.state?.from;
      const destination = `${from?.pathname || '/'}${from?.search || ''}`;
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign in');
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-medium text-slate-800">
              {t('Email')}
            </label>
            <input
              id="login-email"
              data-testid="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
            />
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
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-teal-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? t('Signing in…') : t('Sign in')}
          </button>
        </form>
      </section>
    </main>
  );
}
