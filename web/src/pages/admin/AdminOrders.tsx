import { useCallback, useEffect, useState } from 'react';
import { adminApi, formatMoney } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

type OrderRow = {
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
};

const PICKUP_HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

function statusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'RECEIVED':
      return t('adminOrders.statusReceived');
    case 'READY':
      return t('adminOrders.statusReady');
    case 'PICKED_UP':
      return t('adminOrders.statusPickedUp');
    default:
      return status;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'RECEIVED':
      return 'bg-sky-100 text-sky-900';
    case 'READY':
      return 'bg-emerald-100 text-emerald-900';
    case 'PICKED_UP':
      return 'bg-slate-100 text-ink';
    default:
      return 'bg-slate-100 text-ink';
  }
}

export function AdminOrders() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [filterDate, setFilterDate] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [productInput, setProductInput] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [debouncedPhone, setDebouncedPhone] = useState('');
  const [debouncedProduct, setDebouncedProduct] = useState('');

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedName(nameInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [nameInput]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedPhone(phoneInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [phoneInput]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedProduct(productInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [productInput]);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await adminApi.orders.list(token, slug, {
        pickupDate: filterDate || undefined,
        pickupTime: filterTime || undefined,
        status: (filterStatus as 'RECEIVED' | 'READY' | 'PICKED_UP') || undefined,
        customerName: debouncedName || undefined,
        customerPhone: debouncedPhone || undefined,
        product: debouncedProduct || undefined,
      });
      setOrders(list);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }, [
    token,
    slug,
    filterDate,
    filterTime,
    filterStatus,
    debouncedName,
    debouncedPhone,
    debouncedProduct,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActiveFilters =
    Boolean(filterDate) ||
    Boolean(filterTime) ||
    Boolean(filterStatus) ||
    Boolean(debouncedName) ||
    Boolean(debouncedPhone) ||
    Boolean(debouncedProduct);

  const clearFilters = () => {
    setFilterDate('');
    setFilterTime('');
    setFilterStatus('');
    setNameInput('');
    setPhoneInput('');
    setProductInput('');
    setDebouncedName('');
    setDebouncedPhone('');
    setDebouncedProduct('');
  };

  const setPickedUp = async (orderId: string) => {
    if (!token) return;
    try {
      await adminApi.orders.setStatus(token, slug, orderId, 'PICKED_UP');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  const setItemReady = async (orderId: string, itemId: string, ready: boolean) => {
    if (!token) return;
    setPendingItemId(itemId);
    setErr(null);
    try {
      await adminApi.orders.setItemReady(token, slug, orderId, itemId, ready);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink">{t('adminOrders.title')}</h1>

      <Card
        className={`mb-6 transition-colors ${
          hasActiveFilters ? 'border-primary-300 bg-primary-50/90 shadow-sm shadow-orange-100/40' : ''
        }`}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-medium text-ink">Filtros</p>
          <Button type="button" variant="secondary" className="text-sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Dia de levantamento</Label>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          <div>
            <Label>Hora de levantamento</Label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
            >
              <option value="">Qualquer hora</option>
              {PICKUP_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h.replace(':00', 'h')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Estado</Label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="RECEIVED">Recebido</option>
              <option value="READY">Pronto</option>
              <option value="PICKED_UP">Levantado</option>
            </select>
          </div>
          <div>
            <Label>Nome do cliente</Label>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Pesquisar…"
              autoComplete="off"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              type="tel"
              inputMode="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Pesquisar…"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Produto (nos artigos da encomenda)</Label>
            <Input
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              placeholder={t('adminOrders.searchPlaceholder')}
              autoComplete="off"
            />
          </div>
        </div>
      </Card>

      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {loading ? (
        <p className="text-muted">A carregar…</p>
      ) : orders.length === 0 ? (
        <p className="text-muted">Sem pedidos com estes filtros.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </p>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Artigos</th>
                  <th className="sticky right-0 z-20 min-w-[8.5rem] bg-slate-50 px-4 py-3 text-right shadow-[-10px_0_14px_-6px_rgba(0,0,0,0.12)]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="group align-top hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">{o.pickupDate}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">{o.pickupTime}</td>
                    <td className="max-w-[140px] px-4 py-3 font-medium text-ink">
                      <span className="line-clamp-2">{o.customerName}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink">{o.customerPhone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}
                      >
                        {statusLabel(o.status, t)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {o.paid ? (
                        <span className="text-success">{t('adminOrders.paid')}</span>
                      ) : (
                        <span className="text-warning">{t('adminOrders.unpaid')}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-ink">
                      {formatMoney(o.totalCents)}
                    </td>
                    <td className="min-w-[280px] max-w-lg px-4 py-3 align-top text-xs text-ink">
                      {o.items.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <ul className="space-y-2">
                          {o.items.map((it) => (
                            <li key={it.id} className="flex flex-wrap items-start gap-2">
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary-500"
                                  checked={it.ready}
                                  disabled={o.status === 'PICKED_UP' || pendingItemId === it.id}
                                  onChange={(e) => void setItemReady(o.id, it.id, e.target.checked)}
                                />
                                <span>
                                  <span className="font-medium text-ink">{it.productNameSnapshot}</span>{' '}
                                  <span className="text-muted">{it.variantSnapshot}</span>
                                  <span className="tabular-nums text-ink"> × {it.quantity}</span>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="sticky right-0 z-10 min-w-[8.5rem] bg-surface px-3 py-3 text-right shadow-[-10px_0_14px_-6px_rgba(0,0,0,0.1)] group-hover:bg-slate-50/80">
                      <div className="flex flex-col items-end justify-center gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
                        {o.status === 'READY' && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="!px-3 !py-1.5 text-xs whitespace-nowrap"
                            onClick={() => void setPickedUp(o.id)}
                          >
                            Levantado
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cartões */}
          <div className="space-y-4 md:hidden">
            {orders.map((o) => (
              <Card key={o.id} className="!p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{o.customerName}</p>
                    <p className="font-mono text-sm text-muted">{o.customerPhone}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}
                  >
                    {statusLabel(o.status, t)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink">
                  <span className="tabular-nums">{o.pickupDate}</span>
                  {' · '}
                  <span className="tabular-nums">{o.pickupTime}</span>
                  {' · '}
                  <span className="font-medium text-primary-800">{formatMoney(o.totalCents)}</span>
                  {' · '}
                  {o.paid ? (
                    <span className="text-success">{t('adminOrders.paid')}</span>
                  ) : (
                    <span className="text-warning">{t('adminOrders.unpaid')}</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted">#{o.id.slice(0, 8)}…</p>
                <ul className="mt-3 space-y-2 border-t border-border pt-3 text-sm text-muted">
                  {o.items.map((it) => (
                    <li key={it.id}>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary-500"
                          checked={it.ready}
                          disabled={o.status === 'PICKED_UP' || pendingItemId === it.id}
                          onChange={(e) => void setItemReady(o.id, it.id, e.target.checked)}
                        />
                        <span>
                          {it.productNameSnapshot} {it.variantSnapshot} × {it.quantity}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === 'READY' && (
                    <Button type="button" variant="secondary" className="text-sm" onClick={() => void setPickedUp(o.id)}>
                      Levantado
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
