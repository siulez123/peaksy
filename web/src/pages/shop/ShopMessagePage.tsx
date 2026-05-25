import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { publicApi, formatMoney, type OrderConfirmation } from '../../api';
import { useHostTenantSlug, useResolvedTenantSlug } from '../../lib/tenantHost';
import { formatPickupHourLabel } from '../../lib/timeOfDay';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useI18n } from '../../i18n/context';

function shopHomePath(slug: string, hostSlug: string | null): string {
  if (hostSlug) return '/';
  return `/loja/${encodeURIComponent(slug)}`;
}

function paymentStatusLabel(
  order: OrderConfirmation,
  t: (key: string) => string
): string {
  if (order.paymentMethod === 'IN_STORE') {
    return t('shopMessages.payInStoreOnPickup');
  }
  if (order.paid) {
    return t('shopMessages.payOnlineDone');
  }
  return t('shopMessages.payOnlinePending');
}

function OrderSuccessDetails({ order }: { order: OrderConfirmation }) {
  const { t, localeTag } = useI18n();
  const fmtHour = (slot: string) => formatPickupHourLabel(slot, localeTag);

  return (
    <dl className="mt-6 space-y-4 rounded-xl border border-border bg-canvas/60 p-4 text-left text-sm">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('shopMessages.orderRef')}
        </dt>
        <dd className="mt-0.5 font-mono font-medium text-ink">{order.orderRef}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('common.name')}
        </dt>
        <dd className="mt-0.5 font-medium text-ink">{order.customerName}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('shopMessages.pickup')}
        </dt>
        <dd className="mt-0.5 font-medium text-ink">
          <span className="tabular-nums">{order.pickupDate}</span>
          {' · '}
          <span className="tabular-nums">{fmtHour(order.pickupTime)}</span>
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('shopMessages.items')}
        </dt>
        <dd className="mt-1">
          <ul className="space-y-2">
            {order.items.map((it, i) => (
              <li
                key={`${it.productName}-${it.variant}-${i}`}
                className="flex justify-between gap-3 text-ink"
              >
                <span>
                  <span className="font-medium">{it.productName}</span>{' '}
                  <span className="text-muted">{it.variant}</span>
                  <span className="tabular-nums text-muted"> × {it.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium">{formatMoney(it.lineCents)}</span>
              </li>
            ))}
          </ul>
        </dd>
      </div>
      {order.notes && (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('shopMessages.notes')}
          </dt>
          <dd className="mt-0.5 text-ink">{order.notes}</dd>
        </div>
      )}
      <div className="border-t border-border pt-3">
        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('shopMessages.payment')}
        </dt>
        <dd className="mt-0.5 font-medium text-ink">{paymentStatusLabel(order, t)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-ink">
        <dt>{t('common.total')}</dt>
        <dd className="tabular-nums text-primary">{formatMoney(order.totalCents)}</dd>
      </div>
    </dl>
  );
}

export function ShopSuccessPage() {
  const { t } = useI18n();
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = useResolvedTenantSlug();
  const shopHome = shopHomePath(slug || slugParam || '', hostSlug);
  const [sp] = useSearchParams();
  const orderId = sp.get('order_id');
  const sessionId = sp.get('session_id');

  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');

  const canFetch = Boolean(slug && (orderId || sessionId));

  useEffect(() => {
    if (!canFetch) {
      setLoadState('fail');
      setOrder(null);
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    void publicApi
      .orderConfirmation(slug, { orderId, sessionId })
      .then((data) => {
        if (!cancelled) {
          setOrder(data);
          setLoadState('ok');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrder(null);
          setLoadState('fail');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, orderId, sessionId, canFetch]);

  const subtitle = useMemo(() => {
    if (loadState === 'ok' && order) {
      return t('shopMessages.successHint');
    }
    if (loadState === 'fail') {
      return t('shopMessages.successFallback');
    }
    return t('common.loading');
  }, [loadState, order, t]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-4 text-xl font-semibold text-ink">{t('shopMessages.successTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        {loadState === 'loading' && (
          <p className="mt-4 text-sm text-muted">{t('shopMessages.loadingDetails')}</p>
        )}
        {loadState === 'ok' && order && <OrderSuccessDetails order={order} />}
        <Link
          to={shopHome}
          replace
          className="mt-6 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover sm:w-auto"
        >
          {t('shopMessages.backToShop')}
        </Link>
      </Card>
    </div>
  );
}

export function ShopCancelPage() {
  const { t } = useI18n();
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = slugParam ?? hostSlug ?? '';
  const shopHome = shopHomePath(slug, hostSlug);
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="text-center">
        <XCircle className="mx-auto h-14 w-14 text-warning" />
        <h1 className="mt-4 text-xl font-semibold text-ink">{t('shopMessages.cancelTitle')}</h1>
        <p className="mt-2 text-sm text-muted">{t('shopMessages.cancelBody')}</p>
        <Link
          to={shopHome}
          replace
          className="mt-6 inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover"
        >
          {t('shopMessages.backToShop')}
        </Link>
      </Card>
    </div>
  );
}
