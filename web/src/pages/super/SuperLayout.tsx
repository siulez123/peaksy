import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { BarChart3, Building2, Users, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/context';

export function SuperLayout() {
  const { t } = useI18n();
  const superNavLinks = [
    { to: '/super', end: true, label: t('superNav.metrics'), icon: BarChart3 },
    { to: '/super/padarias', label: t('superNav.bakeries'), icon: Building2 },
    { to: '/super/utilizadores', label: t('superNav.users'), icon: Users },
  ];
  const { token, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!token || !user || user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/super/entrar" replace />;
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {superNavLinks.map(({ to, end, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
              isActive ? 'bg-violet-100 text-violet-900' : 'text-stone-600 hover:bg-stone-100'
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <p className="font-semibold text-violet-900">Peaksy · Super</p>
          <button type="button" className="rounded-lg p-2 sm:hidden" onClick={() => setOpen((o) => !o)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="max-w-[160px] truncate text-xs text-stone-500">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/super/entrar';
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-stone-100 bg-white px-4 py-3 sm:hidden">
            {nav}
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/super/entrar';
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        )}
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:flex-row sm:py-8">
        <aside className="hidden w-52 shrink-0 sm:block">{nav}</aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
