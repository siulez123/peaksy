/** URL pública do webhook Stripe para uma loja (path com slug). */
export function stripeWebhookPath(tenantSlug: string): string {
  return `/public/webhooks/stripe/${encodeURIComponent(tenantSlug)}`;
}

export function stripeWebhookUrlFromRequest(
  tenantSlug: string,
  headers: { host?: string; 'x-forwarded-proto'?: string; 'x-forwarded-host'?: string }
): string {
  const proto = (headers['x-forwarded-proto'] ?? 'http').split(',')[0]!.trim();
  const host = (headers['x-forwarded-host'] ?? headers.host ?? 'localhost:3000').split(',')[0]!.trim();
  return `${proto}://${host}${stripeWebhookPath(tenantSlug)}`;
}
