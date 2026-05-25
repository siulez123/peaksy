import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  ClipboardList,
  Factory,
  Code2,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAdminPathBase, useHostTenantSlug, useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { PeaksyLogoMark } from '../../components/PeaksyLogoMark';

function adminNavLinks(base: string, t: (key: string) => string) {
  return [
    { to: base, end: true as boolean | undefined, label: t('adminNav.summary'), icon: LayoutDashboard },
    { to: `${base}/produtos`, label: t('adminNav.products'), icon: Package },
    { to: `${base}/dias`, label: t('adminNav.days'), icon: CalendarDays },
    { to: `${base}/pedidos`, label: t('adminNav.orders'), icon: ClipboardList },
    { to: `${base}/producao`, label: t('adminNav.production'), icon: Factory },
    { to: `${base}/integracao`, label: t('adminNav.integration'), icon: Code2 },
  ];
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'bg-primary-soft text-primary-soft-text shadow-sm'
      : 'text-muted hover:bg-slate-50 hover:text-ink'
  }`;

export function AdminLayout() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const base = useAdminPathBase();
  const hostTenant = useHostTenantSlug();
  const { token, user, loja, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = adminNavLinks(base, t);

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  if (!token || !user || user.role !== 'LOJA_ADMIN') {
    return <Navigate to={`${base}/entrar`} replace />;
  }
  if (loja && loja.slug !== slug) {
    return <Navigate to={hostTenant ? '/admin' : `/admin/${loja.slug}`} replace />;
  }

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {links.map(({ to, end, label, icon: Icon }) => (
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
          <div className="flex min-w-0 items-center gap-3">
            <PeaksyLogoMark size={36} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">Peaksy</p>
              <p className="truncate text-xs text-muted">{loja?.name ?? slug}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={t('common.menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-4 lg:flex">
            <a
              href={hostTenant ? '/' : `/loja/${slug}`}
              className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
            >
              {t('adminNav.viewShop')}
            </a>
            <LanguageSwitcher variant="footer" />
            <span className="max-w-[160px] truncate text-xs text-muted">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = `${base}/entrar`;
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
            <div className="mb-4 flex justify-end">
              <LanguageSwitcher variant="footer" />
            </div>
            {nav}
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = `${base}/entrar`;
              }}
              className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-slate-50"
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
