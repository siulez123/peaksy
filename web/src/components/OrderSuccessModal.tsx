import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatMoney, type OrderConfirmation } from '../api';
import { formatPickupHourLabel } from '../lib/timeOfDay';
import { printOrderConfirmation } from '../lib/printOrderConfirmation';
import { useI18n } from '../i18n/context';
import { Button } from './ui';

function paymentStatusLabel(order: OrderConfirmation, t: (key: string) => string): string {
  if (order.paymentMethod === 'IN_STORE') {
    return t('shopMessages.payInStoreOnPickup');
  }
  if (order.paid) {
    return t('shopMessages.payOnlineDone');
  }
  return t('shopMessages.payOnlinePending');
}

function OrderConfirmationBody({ order }: { order: OrderConfirmation }) {
  const { t, localeTag } = useI18n();
  const fmtHour = (slot: string) => formatPickupHourLabel(slot, localeTag);

  return (
    <dl className="space-y-4 text-left text-sm">
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

type OrderSuccessModalProps = {
  open: boolean;
  onClose: () => void;
  order: OrderConfirmation | null;
  loadState: 'loading' | 'ok' | 'fail';
};

export function OrderSuccessModal({ open, onClose, order, loadState }: OrderSuccessModalProps) {
  const { t, localeTag } = useI18n();

  if (!open) return null;

  const subtitle =
    loadState === 'ok' && order
      ? t('shopMessages.successHint')
      : loadState === 'fail'
        ? t('shopMessages.successFallback')
        : t('common.loading');

  const handlePrint = () => {
    if (!order) return;
    printOrderConfirmation(
      order,
      {
        title: t('shopMessages.successTitle'),
        orderRef: t('shopMessages.orderRef'),
        name: t('common.name'),
        pickup: t('shopMessages.pickup'),
        items: t('shopMessages.items'),
        notes: t('shopMessages.notes'),
        payment: t('shopMessages.payment'),
        total: t('common.total'),
        paymentStatus: paymentStatusLabel(order, t),
      },
      localeTag
    );
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-success-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div
        className="relative max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
          <h2 id="order-success-modal-title" className="text-lg font-semibold text-ink">
            {t('shopMessages.successTitle')}
          </h2>
          <button
            type="button"
            className="rounded-xl p-2 text-muted hover:bg-canvas"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          </div>

          {loadState === 'loading' && (
            <p className="mt-4 text-center text-sm text-muted">{t('shopMessages.loadingDetails')}</p>
          )}

          {loadState === 'ok' && order && (
            <div className="mt-4 rounded-xl border border-border bg-canvas/60 p-4">
              <p className="mb-3 text-base font-semibold text-ink">{order.lojaName}</p>
              <OrderConfirmationBody order={order} />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {loadState === 'ok' && order && (
              <Button type="button" variant="secondary" className="w-full sm:flex-1" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" aria-hidden />
                {t('shopMessages.print')}
              </Button>
            )}
            <Button type="button" className="w-full sm:flex-1" onClick={onClose}>
              {t('shopMessages.continueShopping')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
