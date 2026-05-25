import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

const PICKUP_HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

type BreakdownData = {
  pickupDate: string;
  pickupDateTo: string | null;
  totalOrders: number;
  rows: Array<{
    pickupDate: string;
    pickupTime: string;
    productName: string;
    variant: string;
    totalQuantity: number;
  }>;
  productTotals: Array<{ productName: string; variant: string; totalQuantity: number }>;
  statusCounts: Record<string, number>;
};

type CatalogProduct = {
  id: string;
  name: string;
  variant: string;
  active: boolean;
};

function BarChartByProduct({
  items,
}: {
  items: Array<{ label: string; quantity: number }>;
}) {
  const { t } = useI18n();
  const max = Math.max(1, ...items.map((x) => x.quantity));
  if (items.length === 0) {
    return <p className="text-sm text-stone-500">{t('adminProduction.noChartData')}</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between gap-2 text-xs text-stone-700">
            <span className="min-w-0 truncate font-medium" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-stone-900">{row.quantity}</span>
          </div>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full min-w-[2px] rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
              style={{ width: `${Math.max(4, (row.quantity / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminProduction() {
  const { t, localeTag } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();

  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [data, setData] = useState<BreakdownData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectableProducts = useMemo(
    () =>
      catalog
        .filter((p) => p.active)
        .slice()
        .sort((a, b) => `${a.name} ${a.variant}`.localeCompare(`${b.name} ${b.variant}`, localeTag)),
    [catalog]
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setCatalogLoading(true);
    void adminApi.products
      .list(token, slug)
      .then((list) => {
        if (!cancelled) setCatalog(list);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, slug]);

  const productIdsKey = selectedProductIds.slice().sort().join(',');

  const hasActiveFilters = Boolean(
    filterTime || (dateTo && dateTo !== dateFrom) || selectedProductIds.length > 0
  );

  const load = useCallback(async () => {
    if (!token || !dateFrom) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const r = await adminApi.orders.productionBreakdown(token, slug, {
        pickupDate: dateFrom,
        pickupDateTo: dateTo && dateTo >= dateFrom ? dateTo : undefined,
        pickupTime: filterTime || undefined,
        productIds: productIdsKey ? productIdsKey : undefined,
      });
      setData(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, slug, dateFrom, dateTo, filterTime, productIdsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartItems = useMemo(() => {
    if (!data?.productTotals.length) return [];
    return data.productTotals.map((t) => ({
      label: `${t.productName} ${t.variant}`.trim(),
      quantity: t.totalQuantity,
    }));
  }, [data]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllProducts = () => {
    setSelectedProductIds(selectableProducts.map((p) => p.id));
  };

  const clearProductSelection = () => {
    setSelectedProductIds([]);
  };

  const clearFilters = () => {
    setFilterTime('');
    setSelectedProductIds([]);
    setDateTo('');
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-stone-900">{t('adminProduction.title')}</h1>
      <p className="mb-6 text-sm text-stone-600">
        Totais por produto e por dia/hora (apenas encomendas <strong>pagas</strong>), para planear a produção.
      </p>

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
            <Label>Data inicial (levantamento)</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>Data final (opcional)</Label>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder={t('adminProduction.sameAsStart')}
            />
            <p className="mt-1 text-xs text-stone-500">{t('adminProduction.rangeHint')}</p>
          </div>
          <div>
            <Label>Hora de levantamento</Label>
            <select
              className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
            >
              <option value="">Todas as horas</option>
              {PICKUP_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h.replace(':00', 'h')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 border-t border-stone-200/80 pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-800">Produtos</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-xs"
                disabled={selectableProducts.length === 0}
                onClick={selectAllProducts}
              >
                Marcar todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-xs"
                disabled={selectedProductIds.length === 0}
                onClick={clearProductSelection}
              >
                Desmarcar todos
              </Button>
            </div>
          </div>
          <p className="mb-3 text-xs text-stone-500">
            Escolhe um ou mais tipos de produto para ver só essas quantidades. Sem seleção, inclui todos os produtos.
          </p>
          {catalogLoading ? (
            <p className="text-sm text-stone-500">A carregar produtos…</p>
          ) : selectableProducts.length === 0 ? (
            <p className="text-sm text-amber-800">{t('adminProduction.noActiveProducts')}</p>
          ) : (
            <div
              className="max-h-[min(50vh,320px)] overflow-y-auto rounded-xl border border-stone-200 bg-white/80 p-3 sm:p-4"
              role="group"
              aria-label="Tipos de produto"
            >
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectableProducts.map((p) => {
                  const checked = selectedProductIds.includes(p.id);
                  return (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:bg-stone-50">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                        />
                        <span className="text-sm leading-snug text-stone-800">
                          <span className="font-medium">{p.name}</span>{' '}
                          <span className="text-stone-500">{p.variant}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'A carregar…' : 'Atualizar'}
          </Button>
        </div>
      </Card>

      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {loading && !data && <p className="text-stone-500">A carregar…</p>}

      {data && !loading && (
        <div className="space-y-6">
          <Card>
            <p className="text-sm text-stone-600">
              <strong>{data.totalOrders}</strong> encomendas pagas no período
              {data.pickupDateTo ? (
                <>
                  {' '}
                  ({data.pickupDate} → {data.pickupDateTo})
                </>
              ) : null}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Estados: Recebido {data.statusCounts.RECEIVED ?? 0} · Pronto {data.statusCounts.READY ?? 0} · Levantado{' '}
              {data.statusCounts.PICKED_UP ?? 0}
            </p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-lg font-semibold text-stone-900">Quantidades por produto</h2>
              <p className="mb-4 text-xs text-stone-500">Soma de todas as horas e dias do filtro.</p>
              <BarChartByProduct items={chartItems} />
              {data.productTotals.length === 0 && (
                <p className="text-sm text-stone-500">{t('adminProduction.noLines')}</p>
              )}
            </Card>

            <Card>
              <h2 className="mb-1 text-lg font-semibold text-stone-900">{t('adminProduction.quickTable')}</h2>
              <p className="mb-4 text-xs text-stone-500">{t('adminProduction.quickTableDesc')}</p>
              <ul className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto text-sm">
                {data.productTotals.map((t, i) => (
                  <li key={i} className="flex justify-between gap-2 border-b border-stone-100 py-2 last:border-0">
                    <span className="text-stone-800">
                      {t.productName} <span className="text-stone-500">{t.variant}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-orange-800">{t.totalQuantity}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <h2 className="mb-1 text-lg font-semibold text-stone-900">Detalhe por dia, hora e produto</h2>
            <p className="mb-4 text-xs text-stone-500">
              Cada linha é a quantidade a produzir para aquela combinação de dia, hora e referência.
            </p>
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-600">
                  <tr>
                    <th className="px-4 py-3">Dia</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Variante</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.rows.map((r, i) => (
                    <tr key={`${r.pickupDate}-${r.pickupTime}-${i}`} className="hover:bg-stone-50/80">
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-stone-800">{r.pickupDate}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-stone-700">{r.pickupTime}</td>
                      <td className="px-4 py-2.5 font-medium text-stone-900">{r.productName}</td>
                      <td className="px-4 py-2.5 text-stone-600">{r.variant}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-orange-800">
                        {r.totalQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.rows.length === 0 && <p className="mt-3 text-sm text-stone-500">Sem linhas para mostrar.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}
