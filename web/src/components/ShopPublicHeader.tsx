import { Link } from 'react-router-dom';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdminPathBase, useHostTenantSlug, useResolvedTenantSlug } from '../lib/tenantHost';

type Props = {
  bakeryLabel: string;
  subtitle?: string;
};

export function ShopPublicHeader({ bakeryLabel, subtitle }: Props) {
  const { token, user, bakery, logout } = useAuth();
  const hostSlug = useHostTenantSlug();
  const slug = useResolvedTenantSlug();
  const adminBase = useAdminPathBase();

  const isBakeryAdminHere =
    token &&
    user?.role === 'BAKERY_ADMIN' &&
    bakery &&
    bakery.slug === slug;

  const loginHref = hostSlug ? '/admin/entrar' : `/admin/${encodeURIComponent(slug)}/entrar`;

  return (
    <header className="mb-4 flex flex-col gap-3 border-b border-stone-200/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{bakeryLabel}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {isBakeryAdminHere ? (
          <>
            <Link
              to={adminBase}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50"
            >
              <LayoutDashboard className="h-4 w-4" />
              Gerir padaria
            </Link>
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
              onClick={() => {
                logout();
                window.location.reload();
              }}
            >
              Sair
            </button>
          </>
        ) : (
          <Link
            to={loginHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            <LogIn className="h-4 w-4" />
            Área da padaria
          </Link>
        )}
      </div>
    </header>
  );
}
