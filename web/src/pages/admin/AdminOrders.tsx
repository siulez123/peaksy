import { useCallback, useEffect, useState } from 'react';
import { adminApi, formatMoney } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';

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

function statusLabel(status: string): string {
  switch (status) {
    case 'RECEIVED':
      return 'Recebido';
    case 'READY':
      return 'Pronto';
    case 'PICKED_UP':
      return 'Levantado';
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
      return 'bg-stone-200 text-stone-800';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

export function AdminOrders() {
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
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Pedidos</h1>

      <Card
        className={`mb-6 transition-colors ${
          hasActiveFilters ? 'border-orange-300 bg-orange-50/90 shadow-sm shadow-orange-100/40' : ''
        }`}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-medium text-stone-800">Filtros</p>
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
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
              placeholder="Ex.: croissant, pão…"
              autoComplete="off"
            />
          </div>
        </div>
      </Card>

      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {loading ? (
        <p className="text-stone-500">A carregar…</p>
      ) : orders.length === 0 ? (
        <p className="text-stone-500">Sem pedidos com estes filtros.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-stone-600">
            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </p>

          {/* Desktop: tabela */}
          <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Artigos</th>
                  <th className="sticky right-0 z-20 min-w-[8.5rem] bg-stone-50 px-4 py-3 text-right shadow-[-10px_0_14px_-6px_rgba(0,0,0,0.12)]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((o) => (
                  <tr key={o.id} className="group align-top hover:bg-stone-50/80">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-stone-800">{o.pickupDate}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-stone-700">{o.pickupTime}</td>
                    <td className="max-w-[140px] px-4 py-3 font-medium text-stone-900">
                      <span className="line-clamp-2">{o.customerName}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-700">{o.customerPhone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {o.paid ? (
                        <span className="text-green-700">Pago</span>
                      ) : (
                        <span className="text-amber-700">Não pago</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-stone-900">
                      {formatMoney(o.totalCents)}
                    </td>
                    <td className="min-w-[280px] max-w-lg px-4 py-3 align-top text-xs text-stone-700">
                      {o.items.length === 0 ? (
                        <span className="text-stone-400">—</span>
                      ) : (
                        <ul className="space-y-2">
                          {o.items.map((it) => (
                            <li key={it.id} className="flex flex-wrap items-start gap-2">
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                                  checked={it.ready}
                                  disabled={o.status === 'PICKED_UP' || pendingItemId === it.id}
                                  onChange={(e) => void setItemReady(o.id, it.id, e.target.checked)}
                                />
                                <span>
                                  <span className="font-medium text-stone-900">{it.productNameSnapshot}</span>{' '}
                                  <span className="text-stone-500">{it.variantSnapshot}</span>
                                  <span className="tabular-nums text-stone-700"> × {it.quantity}</span>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="sticky right-0 z-10 min-w-[8.5rem] bg-white px-3 py-3 text-right shadow-[-10px_0_14px_-6px_rgba(0,0,0,0.1)] group-hover:bg-stone-50/80">
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
                    <p className="font-semibold text-stone-900">{o.customerName}</p>
                    <p className="font-mono text-sm text-stone-600">{o.customerPhone}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}
                  >
                    {statusLabel(o.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-700">
                  <span className="tabular-nums">{o.pickupDate}</span>
                  {' · '}
                  <span className="tabular-nums">{o.pickupTime}</span>
                  {' · '}
                  <span className="font-medium text-orange-800">{formatMoney(o.totalCents)}</span>
                  {' · '}
                  {o.paid ? <span className="text-green-700">Pago</span> : <span className="text-amber-700">Não pago</span>}
                </p>
                <p className="mt-1 text-xs text-stone-400">#{o.id.slice(0, 8)}…</p>
                <ul className="mt-3 space-y-2 border-t border-stone-100 pt-3 text-sm text-stone-600">
                  {o.items.map((it) => (
                    <li key={it.id}>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
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
