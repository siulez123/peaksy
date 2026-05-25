import { ExternalLink, MapPin, Phone, Store } from 'lucide-react';
import type { LojaPublic } from '../api';
import { googleMapsSearchUrl, telHref } from '../lib/lojaContact';
import { useI18n } from '../i18n/context';

type Reason = 'closed' | 'noProducts';

type Props = {
  loja: LojaPublic;
  reason: Reason;
};

export function ShopPublicInfoCenter({ loja, reason }: Props) {
  const { t } = useI18n();
  const mapsUrl = googleMapsSearchUrl(loja);
  const hasAddress =
    loja.addressLine.trim() || loja.postalCode.trim() || loja.locality.trim();
  const hasPhone = loja.phone.trim();

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-12 text-center sm:py-16 md:py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
        <Store className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h2 className="mt-6 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{loja.name}</h2>
      <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted">{t('shop.preOrders')}</p>

      <p className="mt-6 text-base leading-relaxed text-muted">
        {reason === 'closed' ? t('shop.infoClosedDesc') : t('shop.infoNoProductsDesc')}
      </p>

      {(hasAddress || hasPhone) && (
        <div className="mt-10 w-full rounded-2xl border border-border bg-surface p-6 text-left shadow-[var(--shadow-card)] sm:p-8">
          <h3 className="text-center text-xs font-bold uppercase tracking-wider text-muted">
            {t('footer.contact')}
          </h3>
          <address className="mt-5 space-y-5 not-italic">
            {hasAddress && (
              <div className="flex gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 text-sm leading-relaxed">
                  {mapsUrl ? (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex flex-col gap-1 text-ink transition hover:text-primary"
                    >
                      {loja.addressLine.trim() ? (
                        <span className="font-medium">{loja.addressLine}</span>
                      ) : null}
                      {(loja.postalCode.trim() || loja.locality.trim()) && (
                        <span className="text-muted">
                          {[loja.postalCode, loja.locality].filter((s) => s.trim()).join(' ')}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        {t('footer.maps')}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </a>
                  ) : (
                    <>
                      {loja.addressLine.trim() ? (
                        <p className="font-medium text-ink">{loja.addressLine}</p>
                      ) : null}
                      {(loja.postalCode.trim() || loja.locality.trim()) && (
                        <p className="text-muted">
                          {[loja.postalCode, loja.locality].filter((s) => s.trim()).join(' ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {hasPhone && (
              <div className="flex gap-4">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="text-sm">
                  <span className="block text-xs font-medium uppercase tracking-wide text-muted">
                    {t('shop.phone')}
                  </span>
                  <a
                    href={telHref(loja.phone)}
                    className="mt-1 inline-block text-lg font-semibold text-primary transition hover:text-primary-hover"
                  >
                    {loja.phone}
                  </a>
                </p>
              </div>
            )}
          </address>
        </div>
      )}
    </section>
  );
}
