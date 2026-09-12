import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import useAuth from '../../context/useAuth';
import { disableMfa, enableMfa, setupMfa } from '../../services/auth';

export default function MfaSection() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function startSetup(event) { event.preventDefault(); setBusy(true); setError(''); try { setSetup(await setupMfa({ currentPassword: password })); setPassword(''); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  async function confirmSetup(event) { event.preventDefault(); setBusy(true); setError(''); try { await enableMfa(code); setSetup(null); setCode(''); setMessage('MFA enabled. Use an authenticator app at the next sign-in.'); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  async function turnOff(event) { event.preventDefault(); setBusy(true); setError(''); try { await disableMfa(password); setPassword(''); setMessage('MFA disabled. Re-enable it before production use.'); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  return <div className="mt-8 border-t border-slate-200 pt-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><KeyRound className="h-5 w-5" /></div><div><h3 className="font-semibold text-slate-900">Multi-factor authentication</h3><p className="mt-1 text-sm leading-6 text-slate-600">Use a TOTP authenticator app for this account. In production, privileged accounts should have MFA enabled.</p></div></div>{error ? <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}{message ? <p className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}{setup ? <form onSubmit={confirmSetup} className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-700">Add this secret to your authenticator app, then enter the six-digit code.</p><code className="break-all rounded-lg bg-white p-3 text-sm text-slate-800">{setup.secret}</code><code className="break-all rounded-lg bg-white p-3 text-xs text-slate-600">{setup.otpauthUri}</code><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="rounded-xl border border-slate-300 px-3 py-2.5" placeholder="123456" /><button disabled={busy} className="w-fit rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">Confirm MFA</button></form> : <form onSubmit={user?.mfaEnabled ? turnOff : startSetup} className="mt-4 flex flex-wrap items-end gap-3"><label className="text-sm font-medium text-slate-700">Current password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 rounded-xl border border-slate-300 px-3 py-2.5" /></label><button disabled={busy} className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${user?.mfaEnabled ? 'bg-red-700' : 'bg-teal-700'}`}>{user?.mfaEnabled ? 'Disable MFA' : 'Set up MFA'}</button></form>}</div>;
}
