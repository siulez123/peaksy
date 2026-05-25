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

export type UserRole = 'SUPER_ADMIN' | 'LOJA_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  lojaId: string | null;
}

export interface LojaRef {
  id: string;
  name: string;
  slug: string;
}

/** Utilizador na área de super-admin (lista / edição). */
export type SuperUser = {
  id: string;
  email: string;
  role: UserRole;
  lojaId: string | null;
  loja: LojaRef | null;
  createdAt: string;
};

/** Dados públicos da loja (GET /public/loja). */
export interface LojaPublic {
  name: string;
  slug: string;
  addressLine: string;
  postalCode: string;
  locality: string;
  phone: string;
  allowOnlinePayment: boolean;
  allowInStorePayment: boolean;
}

export type CheckoutPaymentMethod = 'ONLINE' | 'IN_STORE';

export type CheckoutResult = {
  paymentMethod: CheckoutPaymentMethod;
  checkoutUrl?: string;
  successUrl?: string;
};

export type OrderConfirmation = {
  orderRef: string;
  lojaName: string;
  customerName: string;
  pickupDate: string;
  pickupTime: string;
  totalCents: number;
  paymentMethod: CheckoutPaymentMethod;
  paid: boolean;
  notes: string | null;
  items: Array<{
    productName: string;
    variant: string;
    quantity: number;
    lineCents: number;
  }>;
};

export interface LoginResponse {
  token: string;
  user: AuthUser;
  loja: LojaRef | null;
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
  /** `tenantSlug` obrigatório para login de LOJA_ADMIN (deve ser o slug da loja do ecrã de login). */
  login: (email: string, password: string, tenantSlug?: string | null) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        ...(tenantSlug != null && String(tenantSlug).trim() !== ''
          ? { tenantSlug: String(tenantSlug).trim() }
          : {}),
      }),
    }),
  me: (token: string, tenantSlug?: string | null) =>
    apiFetch<{
      id: string;
      email: string;
      role: UserRole;
      loja: LojaRef | null;
    }>('/admin/me', { token, tenantSlug }),
};

export const publicApi = {
  loja: (slug: string) => apiFetch<LojaPublic>('/public/loja', { tenantSlug: slug }),
  availableDays: (slug: string) =>
    apiFetch<
      Array<{
        id: string;
        pickupDate: string;
        orderDeadline: string;
        ordersOpenAt: string | null;
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
      /** Raiz da loja (`/` ou `/loja/:slug`) e `/cancelar` no subdomínio. */
      successPath?: string;
      cancelPath?: string;
      paymentMethod?: CheckoutPaymentMethod;
    }
  ) =>
    apiFetch<CheckoutResult>('/public/checkout', {
      method: 'POST',
      tenantSlug: slug,
      body: JSON.stringify(body),
    }),
  orderConfirmation: (
    slug: string,
    q: { orderId?: string | null; sessionId?: string | null }
  ) => {
    const p = new URLSearchParams();
    if (q.orderId) p.set('order_id', q.orderId);
    if (q.sessionId) p.set('session_id', q.sessionId);
    const s = p.toString();
    return apiFetch<OrderConfirmation>(`/public/order-confirmation${s ? `?${s}` : ''}`, {
      tenantSlug: slug,
    });
  },
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
          ordersOpenAt: string | null;
          pickupTimeMin: string;
          pickupTimeMax: string;
          active: boolean;
          dayCapTotal: number | null;
          _count: { orders: number };
          pickupDateRules: Array<{ id: string; pickupDate: string; orderDeadline: string }>;
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
          paymentMethod: 'ONLINE' | 'IN_STORE';
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
  paymentSettings: {
    get: (token: string, slug: string) =>
      apiFetch<{ allowOnlinePayment: boolean; allowInStorePayment: boolean }>(
        '/admin/payment-settings',
        { token, tenantSlug: slug }
      ),
    update: (
      token: string,
      slug: string,
      body: { allowOnlinePayment: boolean; allowInStorePayment: boolean }
    ) =>
      apiFetch<{ allowOnlinePayment: boolean; allowInStorePayment: boolean }>(
        '/admin/payment-settings',
        { method: 'PATCH', token, tenantSlug: slug, body: JSON.stringify(body) }
      ),
  },
};

/** Loja na área de super-admin (lista ou GET). */
export type SuperLoja = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  timezone: string;
  active: boolean;
  plan: string;
  addressLine: string;
  postalCode: string;
  locality: string;
  phone: string;
  createdAt?: string;
  _count: { users: number; products: number; orders: number };
};

export type SuperListResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

export type SuperLojasListQuery = {
  active?: boolean;
  plan?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export type SuperUsersListQuery = {
  role?: string;
  lojaId?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export const superApi = {
  lojas: {
    list: (token: string, query?: SuperLojasListQuery) => {
      const p = new URLSearchParams();
      if (query?.active !== undefined) p.set('active', String(query.active));
      if (query?.plan) p.set('plan', query.plan);
      if (query?.q) p.set('q', query.q);
      if (query?.limit != null) p.set('limit', String(query.limit));
      if (query?.offset != null) p.set('offset', String(query.offset));
      const s = p.toString();
      return apiFetch<SuperListResult<SuperLoja>>(`/super/lojas${s ? `?${s}` : ''}`, { token });
    },
    create: (token: string, body: Record<string, unknown>) =>
      apiFetch('/super/lojas', { method: 'POST', token, body: JSON.stringify(body) }),
    patch: (token: string, id: string, body: Record<string, unknown>) =>
      apiFetch(`/super/lojas/${id}`, { method: 'PATCH', token, body: JSON.stringify(body) }),
    remove: (token: string, id: string) => apiFetch(`/super/lojas/${id}`, { method: 'DELETE', token }),
    metrics: (token: string, id: string, from?: string, to?: string) => {
      const p = new URLSearchParams();
      if (from) p.set('from', from);
      if (to) p.set('to', to);
      const s = p.toString();
      return apiFetch(`/super/lojas/${id}/metrics${s ? `?${s}` : ''}`, { token });
    },
  },
  users: {
    list: (token: string, query?: SuperUsersListQuery) => {
      const p = new URLSearchParams();
      if (query?.role) p.set('role', query.role);
      if (query?.lojaId) p.set('lojaId', query.lojaId);
      if (query?.q) p.set('q', query.q);
      if (query?.limit != null) p.set('limit', String(query.limit));
      if (query?.offset != null) p.set('offset', String(query.offset));
      const s = p.toString();
      return apiFetch<SuperListResult<SuperUser>>(`/super/users${s ? `?${s}` : ''}`, { token });
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
  analytics: (token: string, from?: string, to?: string) => {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const s = p.toString();
    return apiFetch<SuperAnalytics>(`/super/analytics${s ? `?${s}` : ''}`, { token });
  },
};

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export type SuperMetrics = {
  period: { from: string | null; to: string | null };
  lojas: {
    total: number;
    active: number;
    inactive: number;
    byPlan: { STARTER: number; PRO: number; PREMIUM: number };
  };
  users: { total: number; lojaAdmins: number };
  products: { total: number; active: number };
  orders: {
    total: number;
    paid: number;
    unpaid: number;
    averageTicketCents: number;
    byStatus: { RECEIVED: number; READY: number; PICKED_UP: number };
  };
  revenue: { totalCents: number };
  recent: {
    last7Days: { orders: number; revenueCents: number };
    last30Days: { orders: number; revenueCents: number };
  };
  lojaRanking: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    active: boolean;
    locality: string;
    products: number;
    activeProducts: number;
    orders: number;
    paidOrders: number;
    unpaidOrders: number;
    revenueCents: number;
    averageTicketCents: number;
    byStatus: { RECEIVED: number; READY: number; PICKED_UP: number };
    recent: {
      last7Days: { orders: number; revenueCents: number };
      last30Days: { orders: number; revenueCents: number };
    };
  }>;
};

export type SuperAnalytics = {
  period: { from: string | null; to: string | null };
  totals: {
    events: number;
    pageViews: number;
    embedLands: number;
    sessions: number;
  };
  byPage: Array<{ page: string; views: number }>;
  embedBreakdown: Array<{
    embedKey: string;
    lojaId: string | null;
    lojaName: string | null;
    lojaSlug: string | null;
    events: number;
  }>;
  lojaRanking: Array<{
    lojaId: string;
    name: string;
    slug: string;
    pageViews: number;
    embedLands: number;
    byPage: Record<string, number>;
    byEmbed: Record<string, number>;
  }>;
};

export type SuperLojaMetrics = {
  period: { from: string | null; to: string | null };
  loja: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    active: boolean;
    locality: string;
  };
  products: { total: number; active: number };
  orders: {
    total: number;
    paid: number;
    unpaid: number;
    averageTicketCents: number;
    byStatus: { RECEIVED: number; READY: number; PICKED_UP: number };
  };
  revenue: { totalCents: number };
  recent: {
    last7Days: { orders: number; revenueCents: number };
    last30Days: { orders: number; revenueCents: number };
  };
};
