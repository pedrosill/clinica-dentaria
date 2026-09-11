/* ================================
   Imports
================================ */
import { CalendarDays, CreditCard, LayoutDashboard, Settings, Stethoscope, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import useAuth from '../context/useAuth';

/* ================================
   Navigation items
================================ */
const navigationItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/patients',
    label: 'Patients',
    icon: Users,
  },
  {
    to: '/agenda',
    label: 'Agenda',
    icon: CalendarDays,
  },
  {
    to: '/doctors',
    label: 'Doctors',
    icon: Stethoscope,
  },
  {
    to: '/billing',
    label: 'Billing',
    icon: CreditCard,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

/* ================================
   Component
================================ */
export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = String(user?.displayName || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 border-r border-slate-200 bg-white xl:flex">
      <div className="flex w-full flex-col p-5">
        {/* ================================
           Brand block
        ================================ */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-teal-700">Clinic workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            DentalPro
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Clinical Suite</p>
        </div>

        {/* ================================
           Navigation block
        ================================ */}
        <nav className="mt-6 flex-1 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* ================================
           User block
        ================================ */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.displayName}</p>
              <p className="truncate text-sm capitalize text-slate-500">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
