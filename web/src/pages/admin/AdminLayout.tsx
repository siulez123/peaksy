import { NavLink, Outlet, Navigate, useParams } from 'react-router-dom';
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

function adminNavLinks(slug: string) {
  return [
    { to: `/admin/${slug}`, end: true as boolean | undefined, label: 'Resumo', icon: LayoutDashboard },
    { to: `/admin/${slug}/produtos`, label: 'Produtos', icon: Package },
    { to: `/admin/${slug}/dias`, label: 'Dias', icon: CalendarDays },
    { to: `/admin/${slug}/pedidos`, label: 'Pedidos', icon: ClipboardList },
    { to: `/admin/${slug}/producao`, label: 'Produção', icon: Factory },
  ];
}

export function AdminLayout() {
  const { slug = '' } = useParams();
  const { token, user, bakery, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!token || !user || user.role !== 'BAKERY_ADMIN') {
    return <Navigate to={`/admin/${slug}/entrar`} replace />;
  }
  if (bakery && bakery.slug !== slug) {
    return <Navigate to={`/admin/${bakery.slug}`} replace />;
  }

  const nav = (
    <nav className="flex flex-col gap-1 sm:gap-0">
      {adminNavLinks(slug).map(({ to, end, label, icon: Icon }) => (
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
            <p className="truncate text-sm font-semibold text-stone-900">Comebolos</p>
            <p className="truncate text-xs text-stone-500">{bakery?.name ?? slug}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 sm:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="max-w-[140px] truncate text-xs text-stone-500">{user.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = `/admin/${slug}/entrar`;
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
            >
              <LogOut className="h-4 w-4" />
              Sair
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
                window.location.href = `/admin/${slug}/entrar`;
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-600"
            >
              <LogOut className="h-4 w-4" />
              Sair
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
