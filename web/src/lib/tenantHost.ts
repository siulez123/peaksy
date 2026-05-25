import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

const APP_DOMAIN = import.meta.env.VITE_APP_DOMAIN || 'peaksy.com';

/**
 * Resolve o slug da loja a partir do hostname (ex.: lojademo.peaksy.com → lojademo).
 * Em localhost: usa VITE_DEV_TENANT_SLUG se definido; caso contrário null.
 * Reservado: super.<domínio>, www, apex.
 */
export function tenantSlugFromHostname(hostname: string): string | null {
  const h = hostname.toLowerCase().split(':')[0];

  if (h === 'localhost' || h === '127.0.0.1') {
    const dev = import.meta.env.VITE_DEV_TENANT_SLUG;
    return typeof dev === 'string' && dev.trim() ? dev.trim().toLowerCase() : null;
  }

  if (h.endsWith('.localhost')) {
    const sub = h.slice(0, -'.localhost'.length);
    if (sub && !sub.includes('.')) return sub;
    return null;
  }

  if (h === APP_DOMAIN || h === `www.${APP_DOMAIN}`) return null;

  if (h === `super.${APP_DOMAIN}`) return null;

  if (h.endsWith(`.${APP_DOMAIN}`)) {
    const sub = h.slice(0, -`.${APP_DOMAIN}`.length);
    if (!sub || sub.includes('.')) return null;
    if (sub === 'www' || sub === 'super') return null;
    return sub;
  }

  return null;
}

/** Slug derivado apenas do host (subdomínio). */
export function useHostTenantSlug(): string | null {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;
    return tenantSlugFromHostname(window.location.hostname);
  }, []);
}

/** Slug da loja para API: parâmetro da URL ou host. */
export function useResolvedTenantSlug(): string {
  const { slug: p } = useParams<{ slug?: string }>();
  const host = useHostTenantSlug();
  return p ?? host ?? '';
}

/**
 * Prefixo de rotas admin: sem slug no path quando o tenant vem do subdomínio.
 * Ex.: /admin vs /admin/lojademo
 */
export function useAdminPathBase(): string {
  const { slug: p } = useParams<{ slug?: string }>();
  const host = useHostTenantSlug();
  if (p) return `/admin/${p}`;
  if (host) return `/admin`;
  return '/admin';
}
