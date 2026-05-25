import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { BarChart3, Building2, Users, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/context';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { PeaksyLogoMark } from '../../components/PeaksyLogoMark';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-primary-soft text-primary-soft-text shadow-sm'
      : 'text-muted hover:bg-slate-50 hover:text-ink'
  }`;

export function SuperLayout() {
  const { t } = useI18n();
  const superNavLinks = [
    { to: '/super', end: true, label: t('superNav.metrics'), icon: BarChart3 },
    { to: '/super/lojas', label: t('superNav.lojas'), icon: Building2 },
    { to: '/super/utilizadores', label: t('superNav.users'), icon: Users },
  ];
  const { token, user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!token || !user || user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/super/entrar" replace />;
  }

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {superNavLinks.map(({ to, end, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={navClass}>
          <Icon className="h-4 w-4 shrink-0 opacity-80" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh max-w-full overflow-x-clip bg-canvas">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <PeaksyLogoMark size={36} className="shrink-0" />
            <p className="font-semibold text-ink">Peaksy · Super</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-muted lg:hidden"
            onClick={() => setOpen((o) => !o)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-4 lg:flex">
            <LanguageSwitcher variant="footer" />
            <span className="max-w-[180px] truncate text-xs text-muted">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/super/entrar';
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-surface px-4 py-4 lg:hidden">
            {nav}
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/super/entrar';
              }}
              className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        )}
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:flex-row sm:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
            {nav}
          </div>
        </aside>
        <main className="min-w-0 flex-1 pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
