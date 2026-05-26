import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronUp, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import {
  publicApi,
  formatMoney,
  type CheckoutPaymentMethod,
  type LojaPublic,
  type OrderConfirmation,
  type PublicProduct,
} from '../../api';
import { isValidInternationalPhone } from '../../lib/phone';
import { formatPickupHourLabel, pickupHalfHourSlotsBetween } from '../../lib/timeOfDay';
import { useI18n } from '../../i18n/context';
import { ShopPublicFooter } from '../../components/ShopPublicFooter';
import { ShopPublicHeader } from '../../components/ShopPublicHeader';
import { ShopPublicInfoCenter } from '../../components/ShopPublicInfoCenter';
import { LojaNotFoundPage } from '../LojaNotFoundPage';
import { Button, Card, Input, Label } from '../../components/ui';
import { platformHomeHref, useHostTenantSlug, useResolvedTenantSlug } from '../../lib/tenantHost';
import { shopHomePath, shopSuccessReturnPath } from '../../lib/shopPaths';
import { OrderSuccessModal } from '../../components/OrderSuccessModal';
import { ShopProductGrid } from '../../components/shop/ShopProductGrid';
import { VatHint } from '../../components/shop/VatPrice';
import { VatTotalsSummary } from '../../components/shop/VatTotalsSummary';
import { shopPaletteStyle } from '../../lib/shopColorPalettes';

const NOTES_MAX_LENGTH = 40;

type ShopDayRow = {
  id: string;
  pickupDate: string;
  orderDeadline: string;
  ordersOpenAt: string | null;
  pickupTimeMin: string;
  pickupTimeMax: string;
  canOrder: boolean;
};

type Line = {
  productId: string;
  name: string;
  variant: string;
  priceCents: number;
  vatRatePercent: number;
  vatRateLabel: string;
  qty: number;
};

type CartPanelProps = {
  lines: Line[];
  totalCents: number;
  itemCount: number;
  onEncomendar: () => void;
  canEncomendar: boolean;
  variant: 'sidebar' | 'sheet';
  onCloseSheet?: () => void;
  onSetLineQty: (productId: string, qty: number) => void;
};

function CartPanel({
  lines,
  totalCents,
  itemCount,
  onEncomendar,
  canEncomendar,
  variant,
  onCloseSheet,
  onSetLineQty,
}: CartPanelProps) {
  const { t } = useI18n();
  const isSheet = variant === 'sheet';

  return (
    <>
      <div
        className={`mb-3 flex items-center gap-2 font-semibold text-ink ${isSheet ? 'justify-between' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ShoppingBag className="h-5 w-5 shrink-0 text-primary" />
          <span>{t('shop.cart')}</span>
          {lines.length > 0 && (
            <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-soft-text">
              {itemCount === 1 ? t('shop.oneItem', { count: itemCount }) : t('shop.nItems', { count: itemCount })}
            </span>
          )}
        </div>
        {isSheet && onCloseSheet && (
          <button
            type="button"
            className="shrink-0 rounded-xl p-2 text-muted hover:bg-canvas hover:text-ink"
            onClick={onCloseSheet}
            aria-label={t('shop.closeCart')}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted">{t('shop.emptyCart')}</p>
      ) : (
        <ul className="mb-3 space-y-3 text-sm">
          {lines.map((l) => (
            <li
              key={l.productId}
              className="rounded-xl border border-border bg-canvas/50 p-3"
            >
              <div className="min-w-0">
                <p className="break-words font-medium leading-snug text-ink">{l.name}</p>
                <p className="mt-1 break-words text-xs leading-snug text-muted">{l.variant}</p>
                <p className="mt-1 text-xs tabular-nums text-ink">
                  {formatMoney(l.priceCents)}{' '}
                  <span className="text-muted">{t('common.perUnit')}</span>
                </p>
                <VatHint
                  ratePercent={l.vatRatePercent}
                  label={l.vatRateLabel}
                  className="mt-0.5"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-surface p-2 hover:bg-canvas"
                    onClick={() => onSetLineQty(l.productId, l.qty - 1)}
                    aria-label={`Menos um ${l.name}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-base font-semibold tabular-nums text-ink">
                    {l.qty}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-surface p-2 hover:bg-canvas"
                    onClick={() => onSetLineQty(l.productId, l.qty + 1)}
                    aria-label={`Mais um ${l.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-right text-base font-semibold tabular-nums text-ink">
                      {formatMoney(l.priceCents * l.qty)}
                    </span>
                    <VatHint
                      ratePercent={l.vatRatePercent}
                      label={l.vatRateLabel}
                      className="text-right"
                    />
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-700"
                    onClick={() => onSetLineQty(l.productId, 0)}
                    aria-label={t('shop.removeLine', { name: l.name, variant: l.variant })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          <li className="border-t border-border pt-3">
            <VatTotalsSummary totalGrossCents={totalCents} />
          </li>
        </ul>
      )}

      <div className="border-t border-border pt-4">
        <Button
          type="button"
          className="w-full"
          disabled={!canEncomendar}
          onClick={onEncomendar}
        >
          {t('shop.orderBtn')}
        </Button>
      </div>
    </>
  );
}

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  paying: boolean;
  lojaLabel: string;
  days: ShopDayRow[];
  pickupDate: string;
  setPickupDate: (v: string) => void;
  pickupTime: string;
  setPickupTime: (v: string) => void;
  pickupHourSlots: string[];
  selectedDay: ShopDayRow | undefined;
  pickupTimeOk: boolean;
  totalCents: number;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  customerEmail: string;
  setCustomerEmail: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  phoneError: string | null;
  phoneOk: boolean;
  onClearCheckoutErr: () => void;
  onPay: () => void;
  allowOnlinePayment: boolean;
  allowInStorePayment: boolean;
  collectCustomerEmail: boolean;
  paymentMethod: CheckoutPaymentMethod;
  setPaymentMethod: (v: CheckoutPaymentMethod) => void;
  otpStep: 'checkout' | 'otp';
  otpCode: string;
  setOtpCode: (v: string) => void;
  onVerifyOtp: () => void;
  onResendOtp: () => void;
  onOtpBack: () => void;
  resendCooldown: number;
};

function CheckoutErrorDialog({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="checkout-error-title"
      aria-describedby="checkout-error-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
        <h2 id="checkout-error-title" className="text-lg font-semibold text-ink">
          {t('shop.checkoutErrorTitle')}
        </h2>
        <p id="checkout-error-desc" className="mt-3 text-sm leading-relaxed text-red-700">
          {message}
        </p>
        <Button type="button" className="mt-5 w-full" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}

function CheckoutModal({
  open,
  onClose,
  paying,
  lojaLabel,
  days,
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
  pickupHourSlots,
  selectedDay,
  pickupTimeOk,
  totalCents,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  notes,
  setNotes,
  phoneError,
  phoneOk,
  onClearCheckoutErr,
  onPay,
  allowOnlinePayment,
  allowInStorePayment,
  collectCustomerEmail,
  paymentMethod,
  setPaymentMethod,
  otpStep,
  otpCode,
  setOtpCode,
  onVerifyOtp,
  onResendOtp,
  onOtpBack,
  resendCooldown,
}: CheckoutModalProps) {
  const { t, localeTag, formatDateTime } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!open) return null;

  const fmtHour = (slot: string) => formatPickupHourLabel(slot, localeTag);

  const selectPickupDay = (date: string, timeMin: string, timeMax: string) => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    setPickupDate(date);
    const slots = pickupHalfHourSlotsBetween(timeMin, timeMax);
    setPickupTime(slots[0] ?? '');
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollTop });
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!paying) onClose();
        }}
        aria-label={t('common.close')}
      />
      <div
        ref={scrollRef}
        className="relative max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
          <h2 id="checkout-modal-title" className="text-lg font-semibold text-ink">
            {t('shop.checkoutTitle')}
          </h2>
          <button
            type="button"
            className="rounded-xl p-2 text-muted hover:bg-canvas"
            onClick={() => !paying && onClose()}
            disabled={paying}
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div className="text-sm text-muted">
            <p>
              <span className="font-medium text-ink">{lojaLabel}</span>
            </p>
            <div className="mt-3 rounded-xl border border-border bg-canvas/80 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('shop.checkoutTotal')}
              </p>
              <VatTotalsSummary totalGrossCents={totalCents} />
            </div>
          </div>
          {(allowOnlinePayment || allowInStorePayment) && (
            <div className="rounded-xl border border-border bg-canvas/80 p-3">
              <h3 className="mb-2 text-sm font-semibold text-ink">{t('shop.paymentMethod')}</h3>
              {allowOnlinePayment && allowInStorePayment ? (
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
                    <input
                      type="radio"
                      name="checkout-payment"
                      className="mt-0.5"
                      checked={paymentMethod === 'ONLINE'}
                      disabled={paying}
                      onChange={() => setPaymentMethod('ONLINE')}
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">{t('shop.payOnline')}</span>
                      <span className="mt-0.5 block text-xs text-muted">{t('shop.payOnlineDesc')}</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/40">
                    <input
                      type="radio"
                      name="checkout-payment"
                      className="mt-0.5"
                      checked={paymentMethod === 'IN_STORE'}
                      disabled={paying}
                      onChange={() => setPaymentMethod('IN_STORE')}
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">{t('shop.payInStore')}</span>
                      <span className="mt-0.5 block text-xs text-muted">{t('shop.payInStoreDesc')}</span>
                    </span>
                  </label>
                </div>
              ) : allowOnlinePayment ? (
                <p className="text-sm text-muted">{t('shop.payOnlineDesc')}</p>
              ) : (
                <p className="text-sm text-muted">{t('shop.payInStoreDesc')}</p>
              )}
            </div>
          )}

          {paymentMethod === 'ONLINE' && allowOnlinePayment && (
            <p className="text-xs leading-relaxed text-muted">{t('shop.stripeHint')}</p>
          )}
          {paymentMethod === 'IN_STORE' && allowInStorePayment && otpStep === 'checkout' && (
            <p className="text-xs leading-relaxed text-muted">{t('shop.payInStoreDesc')}</p>
          )}

          {otpStep === 'otp' ? (
            <div className="space-y-4 rounded-xl border border-primary/25 bg-primary-soft/30 p-4">
              <h3 className="text-sm font-semibold text-ink">{t('shop.otpTitle')}</h3>
              <p className="text-sm text-muted">
                {t('shop.otpSent', { phone: customerPhone.trim() })}
              </p>
              <p className="text-xs text-muted">{t('shop.inStorePayHint')}</p>
              <div className="pt-1">
                <label htmlFor="shop-otp-code" className="mb-3 block text-sm font-medium text-ink">
                  {t('shop.otpCodeLabel')}
                </label>
                <Input
                  id="shop-otp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={paying}
                  className="border-2 border-slate-300 bg-surface text-center text-lg font-semibold tracking-[0.35em] text-ink tabular-nums shadow-sm placeholder:text-slate-400"
                  required
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={paying || otpCode.length !== 6}
                onClick={() => void onVerifyOtp()}
              >
                {paying ? t('common.loading') : t('shop.otpVerify')}
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/80 pt-3">
                <button
                  type="button"
                  className="text-xs text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={paying || resendCooldown > 0}
                  onClick={() => void onResendOtp()}
                >
                  {t('shop.otpResend')}
                </button>
                <button
                  type="button"
                  className="text-xs text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={paying || resendCooldown > 0}
                  onClick={onOtpBack}
                >
                  {t('shop.otpBack')}
                </button>
              </div>
            </div>
          ) : (
            <>
          <div className="rounded-xl border border-border bg-canvas/80 p-3">
            <h3 className="mb-2 text-sm font-semibold text-ink">{t('shop.pickupDayTime')}</h3>
            {days.length === 0 ? (
              <p className="text-sm text-warning">{t('shop.noPickupDays')}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => (
                    <button
                      key={`${d.id}-${d.pickupDate}`}
                      type="button"
                      disabled={!d.canOrder || paying}
                      onClick={() => selectPickupDay(d.pickupDate, d.pickupTimeMin, d.pickupTimeMax)}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        pickupDate === d.pickupDate
                          ? 'border-primary bg-primary-soft text-primary-soft-text'
                          : d.canOrder
                            ? 'border-border bg-surface hover:border-primary'
                            : 'cursor-not-allowed opacity-40'
                      }`}
                    >
                      {d.pickupDate}
                    </button>
                  ))}
                </div>
                {selectedDay && (
                  <>
                    <div className="mt-3">
                      <Label>{t('shop.pickupTime')}</Label>
                      {selectedDay.ordersOpenAt && new Date(selectedDay.ordersOpenAt) > new Date() && (
                        <p className="mb-2 text-xs text-warning">
                          {t('shop.ordersOpenAt', {
                            date: formatDateTime(selectedDay.ordersOpenAt),
                          })}
                        </p>
                      )}
                      {pickupHourSlots.length === 0 ? (
                        <p className="mt-1 text-sm text-warning" role="alert">
                          {t('shop.noPickupHours')}
                        </p>
                      ) : (
                        <select
                          id="shop-pickup-time"
                          aria-label={t('shop.pickupTime')}
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          disabled={paying}
                          required
                          className="mt-1 max-w-[12rem] w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                        >
                          {pickupHourSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {fmtHour(slot)}
                            </option>
                          ))}
                        </select>
                      )}
                      {pickupHourSlots.length > 0 && (
                        <p className="mt-1 text-xs text-muted">
                          {t('shop.pickupBetween', {
                            min: fmtHour(selectedDay.pickupTimeMin),
                            max: fmtHour(selectedDay.pickupTimeMax),
                          })}
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {t('shop.orderDeadline', {
                        date: formatDateTime(selectedDay.orderDeadline),
                      })}
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          <div>
            <Label>{t('common.name')}</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div>
            <Label>{t('common.phone')}</Label>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                onClearCheckoutErr();
              }}
              maxLength={50}
              aria-invalid={phoneError ? true : undefined}
              required
            />
            <p className="mt-1 text-xs text-muted">{t('shop.phoneHint')}</p>
            {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
          </div>
          {collectCustomerEmail && (
            <div>
              <Label>{t('shop.emailOptional')}</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label>{t('shop.notesOptional')}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={NOTES_MAX_LENGTH}
            />
            <p className="mt-1 text-xs text-muted">
              {t('common.maxChars', { max: NOTES_MAX_LENGTH, current: notes.length })}
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={paying || !customerName.trim() || !phoneOk || !pickupDate || !pickupTimeOk}
            onClick={() => void onPay()}
          >
            {paying
              ? t('shop.payRedirect')
              : paymentMethod === 'IN_STORE'
                ? t('shop.confirmOrder')
                : t('shop.payContinue')}
          </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShopPage() {
  const { t, localeTag } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = useResolvedTenantSlug() || slugParam || hostSlug || '';
  const orderIdParam = searchParams.get('order_id');
  const sessionIdParam = searchParams.get('session_id');
  const fmtHour = (slot: string) => formatPickupHourLabel(slot, localeTag);
  const [days, setDays] = useState<ShopDayRow[]>([]);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTime, setPickupTime] = useState('');
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<OrderConfirmation | null>(null);
  const [successLoad, setSuccessLoad] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);
  const [checkoutErrOpen, setCheckoutErrOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>('ONLINE');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<'checkout' | 'otp'>('checkout');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  type LojaHead = 'loading' | LojaPublic | 'fail';
  const [lojaHead, setLojaHead] = useState<LojaHead>('loading');

  useEffect(() => {
    let cancelled = false;
    setLojaHead('loading');
    void publicApi
      .loja(slug)
      .then((b) => {
        if (!cancelled) setLojaHead(b);
      })
      .catch(() => {
        if (!cancelled) setLojaHead('fail');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const closeSuccess = useCallback(() => {
    setSuccessOpen(false);
    setSuccessOrder(null);
    navigate(shopHomePath(slug, hostSlug), { replace: true });
  }, [navigate, slug, hostSlug]);

  useEffect(() => {
    if (!slug || (!orderIdParam && !sessionIdParam)) return;
    let cancelled = false;
    setSuccessOpen(true);
    setSuccessLoad('loading');
    setCart({});
    setOrderModalOpen(false);
    setMobileCartOpen(false);
    void publicApi
      .orderConfirmation(slug, { orderId: orderIdParam, sessionId: sessionIdParam })
      .then((data) => {
        if (!cancelled) {
          setSuccessOrder(data);
          setSuccessLoad('ok');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuccessOrder(null);
          setSuccessLoad('fail');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug, orderIdParam, sessionIdParam]);

  const lojaPublic = lojaHead !== 'loading' && lojaHead !== 'fail' ? lojaHead : null;
  const allowOnlinePayment = lojaPublic?.allowOnlinePayment ?? true;
  const allowInStorePayment = lojaPublic?.allowInStorePayment ?? false;
  const collectCustomerEmail = lojaPublic?.collectCustomerEmail ?? false;

  useEffect(() => {
    if (!lojaPublic) return;
    if (lojaPublic.allowInStorePayment && !lojaPublic.allowOnlinePayment) {
      setPaymentMethod('IN_STORE');
    } else {
      setPaymentMethod('ONLINE');
    }
  }, [lojaPublic?.allowOnlinePayment, lojaPublic?.allowInStorePayment]);

  const shopTitle =
    lojaHead === 'loading'
      ? t('shop.loadingTitle')
      : lojaHead === 'fail'
        ? t('shop.order')
        : lojaHead.name;
  const shopSubtitle =
    lojaHead !== 'loading' && lojaHead !== 'fail' ? t('shop.preOrders') : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!slug) return;
    if (lojaHead === 'loading') return;
    if (lojaHead === 'fail') {
      setDays([]);
      setPickupDate('');
      setPickupTime('');
      setLoading(false);
      setLoadErr(null);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setLoadErr(null);
        const d = await publicApi.availableDays(slug);
        if (cancelled) return;
        setDays(d);
        const first = d.find((x) => x.canOrder);
        if (first) {
          setPickupDate(first.pickupDate);
          const slots = pickupHalfHourSlotsBetween(first.pickupTimeMin, first.pickupTimeMax);
          setPickupTime(slots[0] ?? '');
        } else {
          setPickupDate('');
          setPickupTime('');
        }
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : t('common.loadError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, lojaHead]);

  useEffect(() => {
    if (!pickupDate || !slug) {
      setProducts([]);
      setProductsLoading(false);
      return;
    }
    if (lojaHead === 'loading' || lojaHead === 'fail') {
      setProducts([]);
      setProductsLoading(false);
      return;
    }
    let cancelled = false;
    setProductsLoading(true);
    (async () => {
      try {
        const p = await publicApi.products(slug, pickupDate);
        if (!cancelled) setProducts(p);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, pickupDate, lojaHead]);

  /** Ao mudar o dia, mantém no carrinho só artigos que existem no catálogo desse dia (evita apagar tudo). */
  useEffect(() => {
    if (products.length === 0) return;
    setCart((c) => {
      let changed = false;
      const next = { ...c };
      for (const id of Object.keys(next)) {
        const p = products.find((x) => x.id === id);
        if (!p) {
          delete next[id];
          changed = true;
          continue;
        }
        if (
          next[id].vatRatePercent !== p.vatRatePercent ||
          next[id].vatRateLabel !== p.vatRateLabel ||
          next[id].priceCents !== p.priceCents
        ) {
          next[id] = {
            ...next[id],
            priceCents: p.priceCents,
            vatRatePercent: p.vatRatePercent,
            vatRateLabel: p.vatRateLabel,
          };
          changed = true;
        }
      }
      return changed ? next : c;
    });
  }, [products]);

  useEffect(() => {
    const d = days.find((x) => x.pickupDate === pickupDate);
    if (!d) {
      setPickupTime('');
      return;
    }
    const slots = pickupHalfHourSlotsBetween(d.pickupTimeMin, d.pickupTimeMax);
    if (slots.length === 0) {
      setPickupTime('');
      return;
    }
    setPickupTime((prev) => (prev && slots.includes(prev) ? prev : slots[0]));
  }, [pickupDate, days]);

  const add = (p: PublicProduct) => {
    setCart((c) => {
      const cur = c[p.id];
      const qty = (cur?.qty || 0) + 1;
      return {
        ...c,
        [p.id]: {
          productId: p.id,
          name: p.name,
          variant: p.variant,
          priceCents: p.priceCents,
          vatRatePercent: p.vatRatePercent,
          vatRateLabel: p.vatRateLabel,
          qty,
        },
      };
    });
  };

  const setQty = (id: string, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else if (next[id]) next[id] = { ...next[id], qty };
      return next;
    });
  };

  const lines = Object.values(cart);
  const totalCents = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  useEffect(() => {
    if (lines.length === 0) setMobileCartOpen(false);
  }, [lines.length]);

  useEffect(() => {
    if (!mobileCartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileCartOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (mq.matches) setMobileCartOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!mobileCartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileCartOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileCartOpen]);

  useEffect(() => {
    if (!orderModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [orderModalOpen]);

  useEffect(() => {
    if (!successOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [successOpen]);

  useEffect(() => {
    if (!successOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSuccess();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [successOpen, closeSuccess]);

  const phoneTrimmed = customerPhone.trim();
  const phoneOk = phoneTrimmed.length > 0 && isValidInternationalPhone(customerPhone);
  const phoneError =
    phoneTrimmed.length > 0 && !isValidInternationalPhone(customerPhone) ? t('shop.phoneInvalid') : null;

  const selectedDay = days.find((d) => d.pickupDate === pickupDate);
  const pickupHourSlots = useMemo(
    () =>
      selectedDay
        ? pickupHalfHourSlotsBetween(selectedDay.pickupTimeMin, selectedDay.pickupTimeMax)
        : [],
    [selectedDay?.pickupTimeMin, selectedDay?.pickupTimeMax]
  );
  const pickupTimeOk = Boolean(
    selectedDay && pickupHourSlots.length > 0 && pickupHourSlots.includes(pickupTime)
  );

  useEffect(() => {
    if (pickupHourSlots.length === 0) return;
    if (!pickupHourSlots.includes(pickupTime)) {
      setPickupTime(pickupHourSlots[0]);
    }
  }, [pickupHourSlots, pickupTime]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const resetOtpFlow = useCallback(() => {
    setVerificationId(null);
    setOtpStep('checkout');
    setOtpCode('');
    setResendCooldown(0);
  }, []);

  const showCheckoutError = useCallback((message: string) => {
    setCheckoutErr(message);
    setCheckoutErrOpen(true);
  }, []);

  const dismissCheckoutError = useCallback(() => {
    setCheckoutErrOpen(false);
    setCheckoutErr(null);
  }, []);

  const closeCheckoutModal = useCallback(() => {
    setOrderModalOpen(false);
    resetOtpFlow();
    dismissCheckoutError();
  }, [resetOtpFlow, dismissCheckoutError]);

  useEffect(() => {
    if (!orderModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !paying) closeCheckoutModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [orderModalOpen, paying, closeCheckoutModal]);

  const buildCheckoutPayload = useCallback(() => {
    return {
      pickupDate,
      pickupTime,
      items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      customerName,
      customerPhone,
      ...(collectCustomerEmail ? { customerEmail: customerEmail || undefined } : {}),
      notes: notes || undefined,
      successPath: shopSuccessReturnPath(slug, hostSlug),
      cancelPath: hostSlug ? '/cancelar' : `/loja/${slug}/cancelar`,
    };
  }, [
    pickupDate,
    pickupTime,
    lines,
    customerName,
    customerPhone,
    customerEmail,
    collectCustomerEmail,
    notes,
    slug,
    hostSlug,
  ]);

  const sendPhoneCode = useCallback(async () => {
    const r = await publicApi.checkoutSendPhoneCode(slug, {
      ...buildCheckoutPayload(),
      paymentMethod: 'IN_STORE',
    });
    setVerificationId(r.verificationId);
    setOtpStep('otp');
    setOtpCode('');
    setResendCooldown(r.resendAfterSeconds);
  }, [slug, buildCheckoutPayload]);

  const verifyOtp = useCallback(async () => {
    if (!verificationId || otpCode.length !== 6) return;
    const res = await publicApi.checkoutVerifyPhone(slug, {
      verificationId,
      code: otpCode,
    });
    if (res.successUrl) {
      const u = new URL(res.successUrl, window.location.origin);
      closeCheckoutModal();
      setCart({});
      navigate(`${u.pathname}${u.search}`, { replace: true });
    }
  }, [verificationId, otpCode, slug, navigate, closeCheckoutModal]);

  const checkout = async () => {
    if (!pickupDate || lines.length === 0 || !selectedDay) return;
    if (!pickupTime || !pickupHourSlots.includes(pickupTime)) {
      showCheckoutError(
        pickupHourSlots.length === 0
          ? t('shop.noPickupHoursDay')
          : t('shop.choosePickupTime', {
              min: fmtHour(selectedDay.pickupTimeMin),
              max: fmtHour(selectedDay.pickupTimeMax),
            })
      );
      return;
    }
    if (!isValidInternationalPhone(customerPhone)) {
      showCheckoutError(t('shop.verifyPhone'));
      return;
    }
    setPaying(true);
    dismissCheckoutError();
    try {
      if (paymentMethod === 'IN_STORE') {
        await sendPhoneCode();
        return;
      }
      const res = await publicApi.checkout(slug, {
        ...buildCheckoutPayload(),
        paymentMethod: 'ONLINE',
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        showCheckoutError(t('common.paymentFailed'));
      }
    } catch (e) {
      showCheckoutError(e instanceof Error ? e.message : t('common.paymentFailed'));
    } finally {
      setPaying(false);
    }
  };

  const handleVerifyOtp = async () => {
    setPaying(true);
    dismissCheckoutError();
    try {
      await verifyOtp();
    } catch (e) {
      showCheckoutError(e instanceof Error ? e.message : t('shop.otpInvalid'));
    } finally {
      setPaying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setPaying(true);
    dismissCheckoutError();
    try {
      await sendPhoneCode();
    } catch (e) {
      showCheckoutError(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setPaying(false);
    }
  };

  const cartPanelProps: Omit<CartPanelProps, 'variant' | 'onCloseSheet'> = {
    lines,
    totalCents,
    itemCount,
    onEncomendar: () => {
      dismissCheckoutError();
      setOrderModalOpen(true);
      setMobileCartOpen(false);
    },
    canEncomendar: Boolean(pickupDate && lines.length > 0),
    onSetLineQty: setQty,
  };

  const lojaLabel =
    lojaHead === 'loading' ? '…' : lojaHead === 'fail' ? t('shop.loja') : lojaHead.name;

  const hasOpenPickupDays = days.some((d) => d.canOrder);
  const showOrderingUI =
    !loading && lojaPublic !== null && hasOpenPickupDays && products.length > 0;
  const showInitialProductsLoad =
    !loading && lojaPublic !== null && hasOpenPickupDays && productsLoading && products.length === 0;
  const infoReason: 'closed' | 'noProducts' = hasOpenPickupDays ? 'noProducts' : 'closed';

  if (!slug) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted">{t('shop.noTenant')}</p>
        <a
          href={platformHomeHref()}
          className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary-hover hover:underline"
        >
          {t('lojaNotFound.peaksyHome')}
        </a>
      </div>
    );
  }

  if (lojaHead === 'fail') {
    return <LojaNotFoundPage slug={slug} />;
  }

  const paletteStyle = lojaPublic ? shopPaletteStyle(lojaPublic.colorPalette) : undefined;

  return (
    <div
      className={`mx-auto max-w-full overflow-x-clip px-4 pt-8 sm:pt-10 ${
        showOrderingUI && lines.length > 0 ? 'pb-32 lg:pb-14' : 'pb-10 sm:pb-12'
      } max-w-6xl`}
      style={paletteStyle}
    >
      <ShopPublicHeader lojaLabel={shopTitle} subtitle={shopSubtitle} />

      {loading && <p className="text-center text-muted py-12">{t('common.loading')}</p>}
      {loadErr && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadErr}</p>}

      {showInitialProductsLoad && (
        <p className="text-center text-muted py-12">{t('common.loading')}</p>
      )}

      {!loading && lojaPublic && !showInitialProductsLoad && !showOrderingUI && (
        <ShopPublicInfoCenter loja={lojaPublic} reason={infoReason} />
      )}

      {showOrderingUI && (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
            <Card className="relative">
              {productsLoading && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-surface/70"
                  aria-hidden
                >
                  <p className="text-sm font-medium text-muted">{t('common.loading')}</p>
                </div>
              )}
              <h2 className="mb-3 font-semibold text-ink">{t('shop.products')}</h2>
              <ShopProductGrid
                layout={lojaPublic.productDisplayLayout ?? 'LARGE'}
                products={products}
                cart={cart}
                t={t}
                onAdd={add}
                onSetQty={setQty}
              />
            </Card>
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-4">
            <CartPanel {...cartPanelProps} variant="sidebar" />
          </Card>
        </div>
      </div>
      )}

      <ShopPublicFooter
        lojaName={shopTitle}
        lojaPublic={lojaPublic}
      />

      {showOrderingUI && lines.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/90 bg-surface/95 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md lg:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-6xl items-stretch gap-2 px-3 pt-3 sm:px-4">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-border bg-canvas/90 px-3 py-3 text-left transition hover:bg-canvas"
              onClick={() => setMobileCartOpen(true)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <ShoppingBag className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="truncate text-sm font-semibold text-ink">
                  {itemCount === 1 ? t('shop.oneItem', { count: itemCount }) : t('shop.nItems', { count: itemCount })}
                </span>
              </span>
              <span className="shrink-0 text-base font-bold tabular-nums text-ink">
                {formatMoney(totalCents)}
              </span>
            </button>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover"
              onClick={() => setMobileCartOpen(true)}
            >
              {t('shop.cart')}
              <ChevronUp className="h-4 w-4 opacity-90" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {showOrderingUI && mobileCartOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="cart-sheet-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileCartOpen(false)}
            aria-label={t('shop.closeCartSummary')}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,920px)] flex-col rounded-t-2xl border border-border bg-surface shadow-2xl">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6">
              <h2 id="cart-sheet-title" className="sr-only">
                {t('shop.cart')}
              </h2>
              <CartPanel
                {...cartPanelProps}
                variant="sheet"
                onCloseSheet={() => setMobileCartOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {orderModalOpen && (
      <CheckoutModal
        open={orderModalOpen}
        onClose={closeCheckoutModal}
        paying={paying}
        lojaLabel={lojaLabel}
        days={days}
        pickupDate={pickupDate}
        setPickupDate={setPickupDate}
        pickupTime={pickupTime}
        setPickupTime={setPickupTime}
        pickupHourSlots={pickupHourSlots}
        selectedDay={selectedDay}
        pickupTimeOk={pickupTimeOk}
        totalCents={totalCents}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        notes={notes}
        setNotes={setNotes}
        phoneError={phoneError}
        phoneOk={phoneOk}
        onClearCheckoutErr={dismissCheckoutError}
        onPay={checkout}
        allowOnlinePayment={allowOnlinePayment}
        allowInStorePayment={allowInStorePayment}
        collectCustomerEmail={collectCustomerEmail}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        otpStep={otpStep}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        onVerifyOtp={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        onOtpBack={() => {
          resetOtpFlow();
          dismissCheckoutError();
        }}
        resendCooldown={resendCooldown}
      />
      )}

      <CheckoutErrorDialog
        open={checkoutErrOpen && Boolean(checkoutErr)}
        message={checkoutErr ?? ''}
        onClose={dismissCheckoutError}
      />

      <OrderSuccessModal
        open={successOpen}
        onClose={closeSuccess}
        order={successOrder}
        loadState={successLoad}
      />
    </div>
  );
}
