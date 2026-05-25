import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  ClipboardList,
  Factory,
  LogOut,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAdminPathBase, useHostTenantSlug, useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

function adminNavLinks(base: string, t: (key: string) => string) {
  return [
    { to: base, end: true as boolean | undefined, label: t('adminNav.summary'), icon: LayoutDashboard },
    { to: `${base}/produtos`, label: t('adminNav.products'), icon: Package },
    { to: `${base}/dias`, label: t('adminNav.days'), icon: CalendarDays },
    { to: `${base}/pedidos`, label: t('adminNav.orders'), icon: ClipboardList },
    { to: `${base}/producao`, label: t('adminNav.production'), icon: Factory },
  ];
}

export function AdminLayout() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const base = useAdminPathBase();
  const hostTenant = useHostTenantSlug();
  const { token, user, bakery, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = adminNavLinks(base, t);

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  if (!token || !user || user.role !== 'BAKERY_ADMIN') {
    return <Navigate to={`${base}/entrar`} replace />;
  }
  if (bakery && bakery.slug !== slug) {
    return <Navigate to={hostTenant ? '/admin' : `/admin/${bakery.slug}`} replace />;
  }

  const nav = (
    <nav className="flex flex-col gap-1 sm:gap-0">
      {links.map(({ to, end, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
              isActive ? 'bg-accent-soft text-accent-soft-text' : 'font-medium text-muted hover:bg-canvas hover:text-ink'
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
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-10 border-b-2 border-ink/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-ink">Peaksy</p>
            <p className="truncate text-xs font-semibold text-muted">{bakery?.name ?? slug}</p>
            <a
              href={hostTenant ? '/' : `/loja/${slug}`}
              className="mt-0.5 block truncate text-xs font-bold text-accent hover:underline"
            >
              {t('adminNav.viewShop')}
            </a>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-ink sm:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={t('common.menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-3 sm:flex">
            <LanguageSwitcher variant="footer" />
            <span className="max-w-[140px] truncate text-xs font-medium text-muted">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = `${base}/entrar`;
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink hover:bg-canvas"
            >
              <LogOut className="h-4 w-4" />
              {t('common.logout')}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t-2 border-ink/5 bg-surface px-4 py-3 sm:hidden">
            <div className="mb-3 flex justify-end">
              <LanguageSwitcher variant="footer" />
            </div>
            {nav}
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = `${base}/entrar`;
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink"
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
