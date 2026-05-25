import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

const CONFIGURED_APP_DOMAIN = (import.meta.env.VITE_APP_DOMAIN || 'peaksy.pro').trim().toLowerCase();

const RESERVED_SUBDOMAINS = new Set(['www', 'super']);

function isReservedSubdomain(sub: string): boolean {
  return RESERVED_SUBDOMAINS.has(sub);
}

/**
 * Fallback: `{slug}.peaksy.pro` → slug, mesmo sem VITE_APP_DOMAIN no build.
 * Ignora hosts Railway (*.up.railway.app) e subdomínios reservados.
 */
function slugFromGenericSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  if (parts.length < 3) return null;

  const apex = parts.slice(-2).join('.');
  if (apex === 'railway.app') return null;

  const sub = parts.slice(0, -2).join('.');
  if (!sub || sub.includes('.') || isReservedSubdomain(sub)) return null;
  if (hostname === apex || hostname === `www.${apex}` || hostname === `super.${apex}`) return null;

  return sub;
}

/**
 * Resolve o slug da loja a partir do hostname (ex.: lojademo.peaksy.pro → lojademo).
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

  if (CONFIGURED_APP_DOMAIN) {
    if (h === CONFIGURED_APP_DOMAIN || h === `www.${CONFIGURED_APP_DOMAIN}`) return null;
    if (h === `super.${CONFIGURED_APP_DOMAIN}`) return null;

    if (h.endsWith(`.${CONFIGURED_APP_DOMAIN}`)) {
      const sub = h.slice(0, -`.${CONFIGURED_APP_DOMAIN}`.length);
      if (!sub || sub.includes('.') || isReservedSubdomain(sub)) return null;
      return sub;
    }
  }

  return slugFromGenericSubdomain(h);
}

/** URL da homepage da plataforma (apex). Em subdomínio de loja → https://peaksy.pro/ */
export function platformHomeHref(): string {
  if (typeof window === 'undefined') return '/';

  const hostSlug = tenantSlugFromHostname(window.location.hostname);
  if (hostSlug) {
    const protocol = window.location.protocol || 'https:';
    return `${protocol}//${CONFIGURED_APP_DOMAIN}/`;
  }

  return '/';
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
