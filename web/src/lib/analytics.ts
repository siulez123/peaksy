import { apiFetch } from '../api';

const SESSION_KEY = 'peaksy_sid';
const REF_KEY = 'peaksy_pk_ref';

export type AnalyticsPageKey =
  | 'APEX_HOME'
  | 'SHOP'
  | 'SHOP_SUCCESS'
  | 'SHOP_CANCEL'
  | 'PICK_SLUG'
  | 'ADMIN_LOGIN'
  | 'ADMIN_DASHBOARD'
  | 'SUPER_LOGIN'
  | 'SUPER_DASHBOARD'
  | 'NOT_FOUND'
  | 'OTHER';

export type AnalyticsEventPayload = {
  kind: 'PAGE_VIEW' | 'EMBED_LAND';
  page: AnalyticsPageKey;
  path: string;
  lojaSlug?: string;
  embedKey?: string;
  referrer?: string;
  sessionId?: string;
};

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'anon';
  }
}

/** Lê pk_ref / pk_embed da URL e guarda na sessão. */
export function captureEmbedRefFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('pk_ref') || params.get('pk_embed');
    if (ref && ['link', 'button', 'iframe'].includes(ref)) {
      sessionStorage.setItem(REF_KEY, ref);
      return ref;
    }
    return sessionStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

export function getStoredEmbedRef(): string | null {
  try {
    return sessionStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}

export function pathnameToAnalyticsPage(pathname: string): AnalyticsPageKey {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === '/') return 'APEX_HOME';
  if (p === '/loja') return 'PICK_SLUG';
  if (p === '/sucesso' || /^\/loja\/[^/]+\/sucesso$/.test(p)) return 'SHOP_SUCCESS';
  if (p === '/cancelar' || /^\/loja\/[^/]+\/cancelar$/.test(p)) return 'SHOP_CANCEL';
  if (/^\/loja\/[^/]+$/.test(p)) return 'SHOP';
  if (p === '/admin/entrar' || /^\/admin\/[^/]+\/entrar$/.test(p)) return 'ADMIN_LOGIN';
  if (p === '/admin' || /^\/admin\/[^/]+$/.test(p)) return 'ADMIN_DASHBOARD';
  if (p.startsWith('/admin')) return 'ADMIN_DASHBOARD';
  if (p === '/super/entrar') return 'SUPER_LOGIN';
  if (p === '/super') return 'SUPER_DASHBOARD';
  if (p.startsWith('/super')) return 'SUPER_DASHBOARD';
  return 'OTHER';
}

export function lojaSlugFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/loja\/([^/]+)/);
  return m?.[1];
}

const queue: AnalyticsEventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushQueue(): Promise<void> {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 20);
  const sessionId = getSessionId();
  try {
    await apiFetch<{ accepted: number }>('/public/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        events: batch.map((e) => ({
          ...e,
          sessionId: e.sessionId ?? sessionId,
          referrer: e.referrer ?? (typeof document !== 'undefined' ? document.referrer || undefined : undefined),
        })),
      }),
    });
  } catch {
    /* analytics não deve bloquear a UI */
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, 400);
}

export function trackAnalyticsEvent(event: AnalyticsEventPayload): void {
  queue.push(event);
  scheduleFlush();
}

export function trackPageView(pathname: string, hostTenantSlug?: string | null): void {
  const embedKey = captureEmbedRefFromUrl();
  let page = pathnameToAnalyticsPage(pathname);
  const slug = hostTenantSlug ?? lojaSlugFromPath(pathname);
  if (slug && (pathname === '/' || pathname === '')) {
    page = 'SHOP';
  }

  trackAnalyticsEvent({
    kind: 'PAGE_VIEW',
    page,
    path: pathname + (typeof window !== 'undefined' ? window.location.search : ''),
    ...(slug ? { lojaSlug: slug } : {}),
    ...(embedKey ? { embedKey } : {}),
  });

  if (embedKey && (page === 'SHOP' || page === 'SHOP_SUCCESS')) {
    trackAnalyticsEvent({
      kind: 'EMBED_LAND',
      page,
      path: pathname,
      ...(slug ? { lojaSlug: slug } : {}),
      embedKey,
    });
  }
}
