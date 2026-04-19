import { sanitizeClientErrorMessage } from './lib/safeErrorMessage';

const rawBase = import.meta.env.VITE_API_URL;
const hasCustomApiUrl =
  rawBase !== undefined && rawBase !== null && String(rawBase).trim() !== '';

/**
 * Base dos pedidos: dev com proxy → `/api`; prod no mesmo host (Railway) → `''`.
 * Define `VITE_API_URL` só se a API estiver noutro domínio.
 */
export const apiBase = hasCustomApiUrl
  ? String(rawBase).replace(/\/$/, '')
  : import.meta.env.DEV
    ? '/api'
    : '';

/** Origem para `/uploads` (vazio = mesma origem). */
export function apiAssetOrigin(): string {
  if (import.meta.env.DEV && !hasCustomApiUrl) return '';
  if (!hasCustomApiUrl) return '';
  return String(rawBase).replace(/\/api\/?$/, '');
}

export function productImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${apiAssetOrigin()}${path}`;
}

export type UserRole = 'SUPER_ADMIN' | 'BAKERY_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  bakeryId: string | null;
}

export interface BakeryRef {
  id: string;
  name: string;
  slug: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  bakery: BakeryRef | null;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { tenantSlug?: string | null; token?: string | null } = {}
): Promise<T> {
  const { tenantSlug, token, headers: h, ...rest } = options;
  const headers = new Headers(h);
  if (!headers.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (tenantSlug) headers.set('X-Tenant-Slug', tenantSlug);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${apiBase}${path}`, { ...rest, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = (await res.json()) as Record<string, unknown>;
      if (typeof j.message === 'string') msg = j.message;
      else if (j.error && typeof j.error === 'object' && j.error !== null) {
        const inner = (j.error as { message?: string }).message;
        msg = typeof inner === 'string' ? inner : res.statusText;
      } else if (typeof j.error === 'string') msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(sanitizeClientErrorMessage(msg || `HTTP ${res.status}`));
  }
  return parseJson<T>(res);
}

export const auth = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token: string, tenantSlug?: string | null) =>
    apiFetch<{
      id: string;
      email: string;
      role: UserRole;
      bakery: BakeryRef | null;
    }>('/admin/me', { token, tenantSlug }),
};

export const publicApi = {
  bakery: (slug: string) =>
    apiFetch<{ name: string; slug: string }>('/public/bakery', { tenantSlug: slug }),
  availableDays: (slug: string) =>
    apiFetch<
      Array<{
        id: string;
        pickupDate: string;
        orderDeadline: string;
        pickupTimeMin: string;
        pickupTimeMax: string;
        canOrder: boolean;
        dayCapTotal: number | null;
      }>
    >('/public/available-days', { tenantSlug: slug }),
  products: (slug: string, pickupDate?: string) => {
    const q = pickupDate ? `?pickupDate=${encodeURIComponent(pickupDate)}` : '';
    return apiFetch<
      Array<{ id: string; name: string; variant: string; priceCents: number; imageUrl: string | null }>
    >(`/public/products${q}`, { tenantSlug: slug });
  },
  checkout: (
    slug: string,
    body: {
      pickupDate: string;
      pickupTime: string;
      items: { productId: string; qty: number }[];
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      notes?: string;
      /** Subdomínio da loja na raiz: `/sucesso` e `/cancelar`; em /loja/:slug omitir. */
      successPath?: string;
      cancelPath?: string;
    }
  ) => apiFetch<{ checkoutUrl: string }>('/public/checkout', { method: 'POST', tenantSlug: slug, body: JSON.stringify(body) }),
};

export const adminApi = {
  products: {
    list: (token: string, slug: string) =>
      apiFetch<
        Array<{
          id: string;
          name: string;
          variant: string;
          priceCents: number;
          imageUrl: string | null;
          active: boolean;
          createdAt: string;
        }>
      >('/admin/products', { token, tenantSlug: slug }),
    create: (token: string, slug: string, body: Record<string, unknown> | FormData) =>
      apiFetch('/admin/products', {
        method: 'POST',
        token,
        tenantSlug: slug,
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
    patch: (token: string, slug: string, id: string, body: Record<string, unknown> | FormData) =>
      apiFetch(`/admin/products/${id}`, {
        method: 'PATCH',
        token,
        tenantSlug: slug,
        body: body instanceof FormData ? body : JSON.stringify(body),
      }),
    remove: (token: string, slug: string, id: string) =>
      apiFetch(`/admin/products/${id}`, { method: 'DELETE', token, tenantSlug: slug }),
  },
  days: {
    list: (token: string, slug: string, pickupDate?: string) => {
      const q = pickupDate ? `?pickupDate=${encodeURIComponent(pickupDate)}` : '';
      return apiFetch<
        Array<{
          id: string;
          pickupDate: string;
          pickupEndDate: string;
          orderDeadline: string;
          pickupTimeMin: string;
          pickupTimeMax: string;
          active: boolean;
          dayCapTotal: number | null;
          _count: { orders: number };
          productCaps: Array<{ id: string; cap: number; productId: string; product: { name: string; variant: string } }>;
        }>
      >(`/admin/available-days${q}`, { token, tenantSlug: slug });
    },
    create: (token: string, slug: string, body: Record<string, unknown>) =>
      apiFetch('/admin/available-days', { method: 'POST', token, tenantSlug: slug, body: JSON.stringify(body) }),
    patch: (token: string, slug: string, id: string, body: Record<string, unknown>) =>
      apiFetch(`/admin/available-days/${id}`, { method: 'PATCH', token, tenantSlug: slug, body: JSON.stringify(body) }),
    remove: (token: string, slug: string, id: string) =>
      apiFetch(`/admin/available-days/${id}`, { method: 'DELETE', token, tenantSlug: slug }),
    setCap: (token: string, slug: string, dayId: string, productId: string, cap: number) =>
      apiFetch(`/admin/available-days/${dayId}/product-caps`, {
        method: 'POST',
        token,
        tenantSlug: slug,
        body: JSON.stringify({ productId, cap }),
      }),
    deleteCap: (token: string, slug: string, dayId: string, productId: string) =>
      apiFetch(`/admin/available-days/${dayId}/product-caps/${productId}`, {
        method: 'DELETE',
        token,
        tenantSlug: slug,
      }),
  },
  orders: {
    list: (
      token: string,
      slug: string,
      q?: {
        pickupDate?: string;
        pickupTime?: string;
        status?: string;
        customerName?: string;
        customerPhone?: string;
        product?: string;
      }
    ) => {
      const p = new URLSearchParams();
      if (q?.pickupDate) p.set('pickupDate', q.pickupDate);
      if (q?.pickupTime) p.set('pickupTime', q.pickupTime);
      if (q?.status) p.set('status', q.status);
      if (q?.customerName) p.set('customerName', q.customerName);
      if (q?.customerPhone) p.set('customerPhone', q.customerPhone);
      if (q?.product) p.set('product', q.product);
      const s = p.toString();
      return apiFetch<
        Array<{
          id: string;
          pickupDate: string;
          pickupTime: string;
          customerName: string;
          customerPhone: string;
          status: string;
          totalCents: number;
          paid: boolean;
          items: Array<{
          id: string;
          quantity: number;
          productNameSnapshot: string;
          variantSnapshot: string;
          ready: boolean;
        }>;
        }>
      >(`/admin/orders${s ? `?${s}` : ''}`, { token, tenantSlug: slug });
    },
    setItemReady: (token: string, slug: string, orderId: string, itemId: string, ready: boolean) =>
      apiFetch(`/admin/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        token,
        tenantSlug: slug,
        body: JSON.stringify({ ready }),
      }),
    setStatus: (token: string, slug: string, id: string, status: 'PICKED_UP') =>
      apiFetch(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        token,
        tenantSlug: slug,
        body: JSON.stringify({ status }),
      }),
    summary: (token: string, slug: string, pickupDate: string) =>
      apiFetch<{
        pickupDate: string;
        productTotals: Array<{ productName: string; variant: string; totalQuantity: number }>;
        statusCounts: Record<string, number>;
        totalOrders: number;
      }>(`/admin/orders/summary?pickupDate=${encodeURIComponent(pickupDate)}`, { token, tenantSlug: slug }),
    productionBreakdown: (
      token: string,
      slug: string,
      q: {
        pickupDate: string;
        pickupDateTo?: string;
        pickupTime?: string;
        /** UUIDs separados por vírgula */
        productIds?: string;
      }
    ) => {
      const p = new URLSearchParams();
      p.set('pickupDate', q.pickupDate);
      if (q.pickupDateTo) p.set('pickupDateTo', q.pickupDateTo);
      if (q.pickupTime) p.set('pickupTime', q.pickupTime);
      if (q.productIds) p.set('productIds', q.productIds);
      return apiFetch<{
        pickupDate: string;
        pickupDateTo: string | null;
        totalOrders: number;
        rows: Array<{
          pickupDate: string;
          pickupTime: string;
          productName: string;
          variant: string;
          totalQuantity: number;
        }>;
        productTotals: Array<{ productName: string; variant: string; totalQuantity: number }>;
        statusCounts: Record<string, number>;
      }>(`/admin/orders/production-breakdown?${p.toString()}`, { token, tenantSlug: slug });
    },
  },
};

export const superApi = {
  bakeries: {
    list: (token: string, active?: boolean) => {
      const q = active !== undefined ? `?active=${active}` : '';
      return apiFetch<
        Array<{
          id: string;
          name: string;
          slug: string;
          active: boolean;
          plan: string;
          _count: { users: number; products: number; orders: number };
        }>
      >(`/super/bakeries${q}`, { token });
    },
    create: (token: string, body: Record<string, unknown>) =>
      apiFetch('/super/bakeries', { method: 'POST', token, body: JSON.stringify(body) }),
    patch: (token: string, id: string, body: Record<string, unknown>) =>
      apiFetch(`/super/bakeries/${id}`, { method: 'PATCH', token, body: JSON.stringify(body) }),
    remove: (token: string, id: string) => apiFetch(`/super/bakeries/${id}`, { method: 'DELETE', token }),
    metrics: (token: string, id: string, from?: string, to?: string) => {
      const p = new URLSearchParams();
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      const s = p.toString();
      return apiFetch(`/super/bakeries/${id}/metrics${s ? `?${s}` : ''}`, { token });
    },
  },
  users: {
    list: (token: string, q?: { role?: string; bakeryId?: string }) => {
      const p = new URLSearchParams();
      if (q?.role) p.set('role', q.role);
      if (q?.bakeryId) p.set('bakeryId', q.bakeryId);
      const s = p.toString();
      return apiFetch<
        Array<{
          id: string;
          email: string;
          role: UserRole;
          bakeryId: string | null;
          bakery: BakeryRef | null;
          createdAt: string;
        }>
      >(`/super/users${s ? `?${s}` : ''}`, { token });
    },
    create: (token: string, body: Record<string, unknown>) =>
      apiFetch('/super/users', { method: 'POST', token, body: JSON.stringify(body) }),
    patch: (token: string, id: string, body: Record<string, unknown>) =>
      apiFetch(`/super/users/${id}`, { method: 'PATCH', token, body: JSON.stringify(body) }),
    remove: (token: string, id: string) => apiFetch(`/super/users/${id}`, { method: 'DELETE', token }),
  },
  metrics: (token: string, from?: string, to?: string) => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const s = p.toString();
    return apiFetch(`/super/metrics${s ? `?${s}` : ''}`, { token });
  },
};

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
