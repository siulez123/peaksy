const APP_DOMAIN = (import.meta.env.VITE_APP_DOMAIN || 'peaksy.pro').trim().toLowerCase();

export type EmbedVariant = 'link' | 'button' | 'iframe';

/** URL pública da loja (cliente), para abrir em nova aba. */
export function publicShopUrl(slug: string, domain?: string | null): string {
  const custom = domain?.trim();
  if (custom) {
    const host = custom.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const protocol =
      typeof window !== 'undefined' && window.location.protocol
        ? window.location.protocol
        : 'https:';
    return `${protocol}//${host}/`;
  }
  const base = shopOrigin(slug);
  const path = import.meta.env.DEV ? `/loja/${slug}` : '/';
  return `${base}${path}`;
}

function shopOrigin(slug: string): string {
  if (typeof window !== 'undefined') {
    const hostSlug = window.location.hostname.split('.')[0];
    if (hostSlug === slug && window.location.hostname.includes('.')) {
      return window.location.origin;
    }
  }
  const protocol =
    typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : 'https:';
  if (import.meta.env.DEV) {
    return `${protocol}//${slug}.localhost:5173`;
  }
  return `${protocol}//${slug}.${APP_DOMAIN}`;
}

function shopUrl(slug: string, ref: EmbedVariant): string {
  const base = shopOrigin(slug);
  const path = import.meta.env.DEV ? `/loja/${slug}` : '/';
  const q = ref === 'iframe' ? `pk_embed=${ref}` : `pk_ref=${ref}`;
  return `${base}${path}?${q}`;
}

export function buildEmbedCodes(slug: string, shopLabel: string): Record<EmbedVariant, string> {
  const urlLink = shopUrl(slug, 'link');
  const urlButton = shopUrl(slug, 'button');
  const urlIframe = shopUrl(slug, 'iframe');

  return {
    link: `<a href="${urlLink}" target="_blank" rel="noopener noreferrer">${shopLabel} — Pré-encomendas</a>`,
    button: `<a href="${urlButton}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#fff;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">Encomendar em ${shopLabel}</a>`,
    iframe: `<iframe src="${urlIframe}" title="${shopLabel} — Pré-encomendas" width="100%" height="720" style="border:1px solid #e2e8f0;border-radius:12px;max-width:480px;" loading="lazy"></iframe>`,
  };
}

export function embedVariantLabel(variant: EmbedVariant): string {
  const labels: Record<EmbedVariant, string> = {
    link: 'Link',
    button: 'Botão',
    iframe: 'Iframe',
  };
  return labels[variant];
}
