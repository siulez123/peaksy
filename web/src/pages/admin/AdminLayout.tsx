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
              isActive ? 'bg-orange-100 text-orange-900' : 'text-stone-600 hover:bg-stone-100'
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
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-900">Peaksy</p>
            <p className="truncate text-xs text-stone-500">{bakery?.name ?? slug}</p>
            <a
              href={hostTenant ? '/' : `/loja/${slug}`}
              className="mt-0.5 block truncate text-xs text-orange-600 hover:underline"
            >
              {t('adminNav.viewShop')}
            </a>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 sm:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={t('common.menu')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="max-w-[140px] truncate text-xs text-stone-500">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = `${base}/entrar`;
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
                window.location.href = `${base}/entrar`;
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
