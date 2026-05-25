/** Caminho da página principal da loja (catálogo / encomenda). */
export function shopHomePath(slug: string, hostSlug: string | null): string {
  if (hostSlug) return '/';
  return `/loja/${encodeURIComponent(slug)}`;
}

/** Caminho de retorno após pagamento Stripe ou encomenda «pagar na loja». */
export function shopSuccessReturnPath(slug: string, hostSlug: string | null): string {
  return shopHomePath(slug, hostSlug);
}

export function orderSuccessSearchParams(orderId?: string | null, sessionId?: string | null): string {
  const p = new URLSearchParams();
  if (orderId) p.set('order_id', orderId);
  if (sessionId) p.set('session_id', sessionId);
  const s = p.toString();
  return s ? `?${s}` : '';
}
