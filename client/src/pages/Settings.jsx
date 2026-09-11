import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuth from '../context/useAuth';

const schedulingRules = [
  {
    label: 'Clinic hours',
    value: '08:00 – 20:00',
    description: 'Appointments can start from 08:00 through 19:30.',
    icon: Clock3,
  },
  {
    label: 'Appointment grid',
    value: '30 minutes',
    description: 'Add and reschedule use the same slot interval.',
    icon: CalendarClock,
  },
  {
    label: 'Active statuses',
    value: 'Scheduled · Arrived',
    description: 'Completed, cancelled, and no-show slots are closed.',
    icon: CheckCircle2,
  },
];

const plannedSettings = [
  'Practice opening days, lunch breaks, holidays, and closures',
  'Provider working hours, appointment types, and room availability',
  'Reminder templates, notification preferences, and clinic contact details',
  'User access, audit history, backups, and data export controls',
];

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="w-full space-y-6">
      <section className="clinic-panel rounded-3xl p-6 md:p-8">
        <p className="text-sm font-medium text-teal-700">Settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Clinic setup
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Keep the rules that shape daily clinic work in one place. Doctor records
          are managed separately so this area can focus on practice-wide settings.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="clinic-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Scheduling policy</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Current rules used by the agenda, add appointment, and reschedule flows.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {schedulingRules.map((rule) => {
              const Icon = rule.icon;

              return (
                <div key={rule.label} className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                  <Icon className="h-5 w-5 text-teal-700" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {rule.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{rule.value}</p>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{rule.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            These defaults are intentionally fixed in this release. Editable practice
            hours and closures are planned next, so changing them will eventually update
            availability everywhere at once.
          </div>
        </section>

        <section className="clinic-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Clinic records</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Use dedicated areas for the records that change most often.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Link
              to="/doctors"
              className="flex items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800"
            >
              Manage doctors
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Link
              to="/agenda"
              className="flex items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800"
            >
              Open clinic agenda
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="clinic-panel rounded-3xl p-6 md:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Signed-in account</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The account currently managing this clinic workspace.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{user?.displayName}</p>
            <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
            <p className="mt-3 inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold capitalize text-teal-800">
              {user?.role}
            </p>
          </div>
        </section>

        <section className="clinic-panel rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Next configuration areas</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            These are the highest-value settings to add as the clinic workflow grows.
          </p>
          <ul className="mt-5 space-y-3">
            {plannedSettings.map((setting) => (
              <li key={setting} className="flex gap-3 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
                <span>{setting}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
