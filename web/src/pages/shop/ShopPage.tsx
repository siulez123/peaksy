import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronUp, ImageIcon, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { publicApi, formatMoney, productImageUrl, type BakeryPublic } from '../../api';
import { isValidInternationalPhone, phoneFieldHint } from '../../lib/phone';
import {
  formatPickupHourLabelPt,
  pickupHourSlotsBetween,
} from '../../lib/timeOfDay';
import { ShopPublicFooter } from '../../components/ShopPublicFooter';
import { ShopPublicHeader } from '../../components/ShopPublicHeader';
import { BakeryNotFoundPage } from '../BakeryNotFoundPage';
import { Button, Card, Input, Label } from '../../components/ui';
import { useHostTenantSlug } from '../../lib/tenantHost';

const NOTES_MAX_LENGTH = 40;

type ShopDayRow = {
  id: string;
  pickupDate: string;
  orderDeadline: string;
  pickupTimeMin: string;
  pickupTimeMax: string;
  canOrder: boolean;
};

type Line = { productId: string; name: string; variant: string; priceCents: number; qty: number };

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
  const isSheet = variant === 'sheet';

  return (
    <>
      <div
        className={`mb-3 flex items-center gap-2 font-semibold text-stone-900 ${isSheet ? 'justify-between' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ShoppingBag className="h-5 w-5 shrink-0 text-orange-600" />
          <span>Carrinho</span>
          {lines.length > 0 && (
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
              {itemCount} {itemCount === 1 ? 'artigo' : 'artigos'}
            </span>
          )}
        </div>
        {isSheet && onCloseSheet && (
          <button
            type="button"
            className="shrink-0 rounded-xl p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            onClick={onCloseSheet}
            aria-label="Fechar carrinho"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-stone-500">O carrinho está vazio.</p>
      ) : (
        <ul className="mb-3 space-y-3 text-sm">
          {lines.map((l) => (
            <li
              key={l.productId}
              className="rounded-xl border border-stone-100 bg-stone-50/50 p-3"
            >
              <div className="min-w-0">
                <p className="break-words font-medium leading-snug text-stone-900">{l.name}</p>
                <p className="mt-1 break-words text-xs leading-snug text-stone-600">{l.variant}</p>
                <p className="mt-1 text-xs tabular-nums text-stone-500">
                  {formatMoney(l.priceCents)} <span className="text-stone-400">/ un.</span>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100/80 pt-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded-lg border border-stone-200 bg-white p-2 hover:bg-stone-100"
                    onClick={() => onSetLineQty(l.productId, l.qty - 1)}
                    aria-label={`Menos um ${l.name}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2.5rem] text-center text-base font-semibold tabular-nums text-stone-900">
                    {l.qty}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-200 bg-white p-2 hover:bg-stone-100"
                    onClick={() => onSetLineQty(l.productId, l.qty + 1)}
                    aria-label={`Mais um ${l.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-right text-base font-semibold tabular-nums text-stone-900">
                    {formatMoney(l.priceCents * l.qty)}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-700"
                    onClick={() => onSetLineQty(l.productId, 0)}
                    aria-label={`Remover linha ${l.name} ${l.variant}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          <li className="flex justify-between border-t border-stone-100 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatMoney(totalCents)}</span>
          </li>
        </ul>
      )}

      <div className="border-t border-stone-100 pt-4">
        <Button
          type="button"
          className="w-full"
          disabled={!canEncomendar}
          onClick={onEncomendar}
        >
          Encomendar
        </Button>
      </div>
    </>
  );
}

type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  paying: boolean;
  bakeryLabel: string;
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
  checkoutErr: string | null;
  onClearCheckoutErr: () => void;
  onPay: () => void;
};

function CheckoutModal({
  open,
  onClose,
  paying,
  bakeryLabel,
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
  checkoutErr,
  onClearCheckoutErr,
  onPay,
}: CheckoutModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!paying) onClose();
        }}
        aria-label="Fechar"
      />
      <div className="relative max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-200 bg-white shadow-2xl sm:rounded-2xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3 sm:px-6">
          <h2 id="checkout-modal-title" className="text-lg font-semibold text-stone-900">
            Dados da encomenda
          </h2>
          <button
            type="button"
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
            onClick={() => !paying && onClose()}
            disabled={paying}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <p className="text-sm text-stone-600">
            <span className="font-medium text-stone-800">{bakeryLabel}</span>
            {' · '}
            Total <span className="font-semibold text-orange-700">{formatMoney(totalCents)}</span>
          </p>
          <p className="text-xs leading-relaxed text-stone-500">
            Serás redirecionado para o pagamento seguro do Stripe (cartão, MB WAY, etc., conforme o que estiver
            disponível).
          </p>

          {checkoutErr && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              {checkoutErr}
            </p>
          )}

          <div className="rounded-xl border border-stone-100 bg-stone-50/80 p-3">
            <h3 className="mb-2 text-sm font-semibold text-stone-900">Dia e hora de levantamento</h3>
            {days.length === 0 ? (
              <p className="text-sm text-amber-800">Sem dias disponíveis para encomenda.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => (
                    <button
                      key={`${d.id}-${d.pickupDate}`}
                      type="button"
                      disabled={!d.canOrder || paying}
                      onClick={() => {
                        setPickupDate(d.pickupDate);
                        const slots = pickupHourSlotsBetween(d.pickupTimeMin, d.pickupTimeMax);
                        setPickupTime(slots[0] ?? '');
                      }}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        pickupDate === d.pickupDate
                          ? 'border-orange-500 bg-orange-50 text-orange-900'
                          : d.canOrder
                            ? 'border-stone-200 bg-white hover:border-orange-300'
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
                      <Label>Hora de levantamento</Label>
                      {pickupHourSlots.length === 0 ? (
                        <p className="mt-1 text-sm text-amber-800" role="alert">
                          Não há horas disponíveis para este período. Contacta a padaria.
                        </p>
                      ) : (
                        <select
                          id="shop-pickup-time"
                          aria-label="Hora de levantamento"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          disabled={paying}
                          required
                          className="mt-1 max-w-[12rem] w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-60"
                        >
                          {pickupHourSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {formatPickupHourLabelPt(slot)}
                            </option>
                          ))}
                        </select>
                      )}
                      {pickupHourSlots.length > 0 && (
                        <p className="mt-1 text-xs text-stone-500">
                          Entre {formatPickupHourLabelPt(selectedDay.pickupTimeMin)} e{' '}
                          {formatPickupHourLabelPt(selectedDay.pickupTimeMax)} (definido pela padaria).
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-stone-500">
                      Limite de encomenda: {new Date(selectedDay.orderDeadline).toLocaleString('pt-PT')}
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          <div>
            <Label>Nome</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div>
            <Label>Telefone</Label>
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
            <p className="mt-1 text-xs text-stone-500">{phoneFieldHint}</p>
            {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
          </div>
          <div>
            <Label>Email (opcional)</Label>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={NOTES_MAX_LENGTH}
            />
            <p className="mt-1 text-xs text-stone-500">
              Máx. {NOTES_MAX_LENGTH} caracteres ({notes.length}/{NOTES_MAX_LENGTH})
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={paying || !customerName.trim() || !phoneOk || !pickupDate || !pickupTimeOk}
            onClick={() => void onPay()}
          >
            {paying ? 'A redirecionar…' : 'Continuar para pagamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ShopPage() {
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = slugParam ?? hostSlug ?? '';
  const [days, setDays] = useState<ShopDayRow[]>([]);
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTime, setPickupTime] = useState('');
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; variant: string; priceCents: number; imageUrl: string | null }>
  >([]);
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
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);
  type BakeryHead = 'loading' | BakeryPublic | 'fail';
  const [bakeryHead, setBakeryHead] = useState<BakeryHead>('loading');

  useEffect(() => {
    let cancelled = false;
    setBakeryHead('loading');
    void publicApi
      .bakery(slug)
      .then((b) => {
        if (!cancelled) setBakeryHead(b);
      })
      .catch(() => {
        if (!cancelled) setBakeryHead('fail');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const shopTitle =
    bakeryHead === 'loading' ? 'A carregar…' : bakeryHead === 'fail' ? 'Encomendar' : bakeryHead.name;
  const shopSubtitle =
    bakeryHead !== 'loading' && bakeryHead !== 'fail' ? 'Pré-encomendas' : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!slug) return;
    if (bakeryHead === 'loading') return;
    if (bakeryHead === 'fail') {
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
          const slots = pickupHourSlotsBetween(first.pickupTimeMin, first.pickupTimeMax);
          setPickupTime(slots[0] ?? '');
        } else {
          setPickupDate('');
          setPickupTime('');
        }
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : 'Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, bakeryHead]);

  useEffect(() => {
    if (!pickupDate || !slug) {
      setProducts([]);
      return;
    }
    if (bakeryHead === 'loading' || bakeryHead === 'fail') {
      setProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await publicApi.products(slug, pickupDate);
        if (!cancelled) setProducts(p);
      } catch {
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, pickupDate, bakeryHead]);

  /** Ao mudar o dia, mantém no carrinho só artigos que existem no catálogo desse dia (evita apagar tudo). */
  useEffect(() => {
    if (products.length === 0) return;
    const validIds = new Set(products.map((p) => p.id));
    setCart((c) => {
      let changed = false;
      const next = { ...c };
      for (const id of Object.keys(next)) {
        if (!validIds.has(id)) {
          delete next[id];
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
    const slots = pickupHourSlotsBetween(d.pickupTimeMin, d.pickupTimeMax);
    if (slots.length === 0) {
      setPickupTime('');
      return;
    }
    setPickupTime((prev) => (prev && slots.includes(prev) ? prev : slots[0]));
  }, [pickupDate, days]);

  const add = (p: { id: string; name: string; variant: string; priceCents: number }) => {
    setCart((c) => {
      const cur = c[p.id];
      const qty = (cur?.qty || 0) + 1;
      return { ...c, [p.id]: { productId: p.id, name: p.name, variant: p.variant, priceCents: p.priceCents, qty } };
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
    if (!orderModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !paying) setOrderModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [orderModalOpen, paying]);

  const phoneTrimmed = customerPhone.trim();
  const phoneOk = phoneTrimmed.length > 0 && isValidInternationalPhone(customerPhone);
  const phoneError =
    phoneTrimmed.length > 0 && !isValidInternationalPhone(customerPhone)
      ? 'Número inválido. Usa 8 a 15 dígitos; podes incluir + e o código do país.'
      : null;

  const selectedDay = days.find((d) => d.pickupDate === pickupDate);
  const pickupHourSlots = useMemo(
    () =>
      selectedDay
        ? pickupHourSlotsBetween(selectedDay.pickupTimeMin, selectedDay.pickupTimeMax)
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

  const checkout = async () => {
    if (!pickupDate || lines.length === 0 || !selectedDay) return;
    if (!pickupTime || !pickupHourSlots.includes(pickupTime)) {
      setCheckoutErr(
        pickupHourSlots.length === 0
          ? 'Não há horas de levantamento disponíveis para este dia.'
          : `Escolhe uma hora entre ${formatPickupHourLabelPt(selectedDay.pickupTimeMin)} e ${formatPickupHourLabelPt(selectedDay.pickupTimeMax)}.`
      );
      return;
    }
    if (!isValidInternationalPhone(customerPhone)) {
      setCheckoutErr('Verifica o número de telefone antes de continuar.');
      return;
    }
    setPaying(true);
    setCheckoutErr(null);
    try {
      const { checkoutUrl } = await publicApi.checkout(slug, {
        pickupDate,
        pickupTime,
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        notes: notes || undefined,
        successPath: hostSlug ? '/sucesso' : `/loja/${slug}/sucesso`,
        cancelPath: hostSlug ? '/cancelar' : `/loja/${slug}/cancelar`,
      });
      window.location.href = checkoutUrl;
    } catch (e) {
      setCheckoutErr(e instanceof Error ? e.message : 'Pagamento falhou');
    } finally {
      setPaying(false);
    }
  };

  const cartPanelProps: Omit<CartPanelProps, 'variant' | 'onCloseSheet'> = {
    lines,
    totalCents,
    itemCount,
    onEncomendar: () => {
      setCheckoutErr(null);
      setOrderModalOpen(true);
      setMobileCartOpen(false);
    },
    canEncomendar: Boolean(pickupDate && lines.length > 0),
    onSetLineQty: setQty,
  };

  const bakeryLabel =
    bakeryHead === 'loading' ? '…' : bakeryHead === 'fail' ? 'Padaria' : bakeryHead.name;

  const hasOpenPickupDays = days.some((d) => d.canOrder);

  if (!slug) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-stone-600">
          Não foi possível identificar a padaria. Usa o subdomínio (ex.: padariademo.localhost) ou{' '}
          <a href="/loja" className="text-orange-600 hover:underline">
            escolhe a padaria por slug
          </a>
          .
        </p>
      </div>
    );
  }

  if (bakeryHead === 'fail') {
    return <BakeryNotFoundPage slug={slug} />;
  }

  return (
    <div
      className={`mx-auto max-w-6xl px-4 pt-8 sm:pt-10 ${
        lines.length > 0 ? 'pb-32 lg:pb-14' : 'pb-10 sm:pb-12'
      }`}
    >
      <ShopPublicHeader bakeryLabel={shopTitle} subtitle={shopSubtitle} />

      {loading && <p className="text-stone-500">A carregar…</p>}
      {loadErr && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadErr}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!loading && hasOpenPickupDays && (
            <Card>
              <h2 className="mb-3 font-semibold text-stone-900">Produtos</h2>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {products.map((p) => {
                  const img = productImageUrl(p.imageUrl);
                  return (
                    <li
                      key={p.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="relative aspect-[5/4] w-full overflow-hidden bg-stone-100">
                        {img ? (
                          <img
                            src={img}
                            alt={`${p.name} ${p.variant}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-stone-400">
                            <ImageIcon className="h-14 w-14 opacity-60" strokeWidth={1.25} />
                            <span className="text-xs">Sem imagem</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-4">
                        <div>
                          <p className="text-base font-semibold leading-snug text-stone-900">
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-sm text-stone-500">{p.variant}</p>
                          <p className="mt-2 text-lg font-semibold text-orange-700">
                            {formatMoney(p.priceCents)}
                          </p>
                        </div>
                        <div className="mt-auto flex w-full items-center justify-center gap-3 pt-1">
                          {cart[p.id] ? (
                            <>
                              <button
                                type="button"
                                className="rounded-lg border border-stone-200 p-2 hover:bg-stone-50"
                                onClick={() => setQty(p.id, (cart[p.id]?.qty || 0) - 1)}
                                aria-label="Menos um"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="min-w-[2.5rem] text-center text-base font-semibold tabular-nums">
                                {cart[p.id].qty}
                              </span>
                              <button
                                type="button"
                                className="rounded-lg border border-stone-200 p-2 hover:bg-stone-50"
                                onClick={() => add(p)}
                                aria-label="Mais um"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              className="w-full !py-2.5 text-sm font-medium"
                              onClick={() => add(p)}
                            >
                              Adicionar
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-4">
            <CartPanel {...cartPanelProps} variant="sidebar" />
          </Card>
        </div>
      </div>

      <ShopPublicFooter
        bakeryName={shopTitle}
        subtitle={shopSubtitle}
        bakery={bakeryHead === 'loading' ? null : bakeryHead}
      />

      {lines.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200/90 bg-white/95 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md lg:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-6xl items-stretch gap-2 px-3 pt-3 sm:px-4">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/90 px-3 py-3 text-left transition hover:bg-stone-100"
              onClick={() => setMobileCartOpen(true)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <ShoppingBag className="h-5 w-5 shrink-0 text-orange-600" aria-hidden />
                <span className="truncate text-sm font-semibold text-stone-900">
                  {itemCount} {itemCount === 1 ? 'artigo' : 'artigos'}
                </span>
              </span>
              <span className="shrink-0 text-base font-bold tabular-nums text-stone-900">
                {formatMoney(totalCents)}
              </span>
            </button>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
              onClick={() => setMobileCartOpen(true)}
            >
              Carrinho
              <ChevronUp className="h-4 w-4 opacity-90" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {mobileCartOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="cart-sheet-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setMobileCartOpen(false)}
            aria-label="Fechar resumo"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,920px)] flex-col rounded-t-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6">
              <h2 id="cart-sheet-title" className="sr-only">
                Carrinho
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

      <CheckoutModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        paying={paying}
        bakeryLabel={bakeryLabel}
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
        checkoutErr={checkoutErr}
        onClearCheckoutErr={() => setCheckoutErr(null)}
        onPay={checkout}
      />
    </div>
  );
}
