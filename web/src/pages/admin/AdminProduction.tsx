import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  productPendingTotals: Array<{ productName: string; variant: string; totalQuantity: number }>;
  statusCounts: Record<string, number>;
  ordersPickedUp: number;
  ordersNotPickedUp: number;
};

function ProductionQtyTable({
  rows,
  emptyMessage,
}: {
  rows: Array<{ productName: string; variant: string; totalQuantity: number }>;
  emptyMessage: string;
}) {
  const { t } = useI18n();
  const total = rows.reduce((s, r) => s + r.totalQuantity, 0);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[280px] text-left text-sm">
        <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">{t('adminCommon.product')}</th>
            <th className="px-4 py-3">{t('adminCommon.variant')}</th>
            <th className="px-4 py-3 text-right">{t('adminCommon.quantity')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50/80">
              <td className="px-4 py-2.5 font-medium text-ink">{r.productName}</td>
              <td className="px-4 py-2.5 text-muted">{r.variant}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-primary-800">
                {r.totalQuantity}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-border bg-slate-50/80">
          <tr>
            <td colSpan={2} className="px-4 py-2.5 text-sm font-semibold text-ink">
              {t('common.total')}
            </td>
            <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-ink">{total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

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
    return <p className="text-sm text-muted">{t('adminProduction.noChartData')}</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between gap-2 text-xs text-ink">
            <span className="min-w-0 truncate font-medium" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-ink">{row.quantity}</span>
          </div>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full min-w-[2px] rounded-full bg-gradient-to-r from-primary to-indigo-400"
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

  const scrollYRef = useRef(0);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(
    async (opts?: { preserveScroll?: boolean }) => {
      if (!token || !dateFrom) {
        setLoading(false);
        return;
      }
      if (opts?.preserveScroll) {
        scrollYRef.current = window.scrollY;
      }
      const background = hasLoadedOnce.current;
      if (!background) {
        setLoading(true);
      }
      setErr(null);
      try {
        const r = await adminApi.orders.productionBreakdown(token, slug, {
          pickupDate: dateFrom,
          pickupDateTo: dateTo && dateTo >= dateFrom ? dateTo : undefined,
          pickupTime: filterTime || undefined,
          productIds: productIdsKey ? productIdsKey : undefined,
        });
        setData(r);
        hasLoadedOnce.current = true;
      } catch (e) {
        setErr(e instanceof Error ? e.message : t('common.genericError'));
        if (!background) {
          setData(null);
        }
      } finally {
        setLoading(false);
        if (opts?.preserveScroll) {
          const y = scrollYRef.current;
          requestAnimationFrame(() => {
            window.scrollTo(0, y);
          });
        }
      }
    },
    [token, slug, dateFrom, dateTo, filterTime, productIdsKey, t]
  );

  useEffect(() => {
    void load({ preserveScroll: hasLoadedOnce.current });
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
      <h1 className="mb-2 text-2xl font-semibold text-ink">{t('adminProduction.title')}</h1>
      <p className="mb-6 text-sm text-muted">{t('adminProduction.subtitle')}</p>

      <Card
        className={`mb-6 transition-colors ${
          hasActiveFilters ? 'border-primary-300 bg-primary-50/90 shadow-sm shadow-orange-100/40' : ''
        }`}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-medium text-ink">{t('adminCommon.filters')}</p>
          <Button type="button" variant="secondary" className="text-sm" onClick={clearFilters}>
            {t('adminCommon.clearFilters')}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>{t('adminProduction.dateFrom')}</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>{t('adminProduction.dateToOptional')}</Label>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder={t('adminProduction.sameAsStart')}
            />
            <p className="mt-1 text-xs text-muted">{t('adminProduction.rangeHint')}</p>
          </div>
          <div>
            <Label>{t('adminProduction.pickupTime')}</Label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
            >
              <option value="">{t('adminCommon.allHours')}</option>
              {PICKUP_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h.replace(':00', 'h')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 border-t border-border/80 pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">{t('adminCommon.products')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-xs"
                disabled={selectableProducts.length === 0}
                onClick={selectAllProducts}
              >
                {t('adminProduction.selectAllProducts')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-xs"
                disabled={selectedProductIds.length === 0}
                onClick={clearProductSelection}
              >
                {t('adminProduction.deselectAllProducts')}
              </Button>
            </div>
          </div>
          <p className="mb-3 text-xs text-muted">{t('adminProduction.productsFilterHint')}</p>
          {catalogLoading ? (
            <p className="text-sm text-muted">{t('adminProduction.loadingProducts')}</p>
          ) : selectableProducts.length === 0 ? (
            <p className="text-sm text-warning">{t('adminProduction.noActiveProducts')}</p>
          ) : (
            <div
              className="max-h-[min(50vh,320px)] overflow-y-auto rounded-xl border border-border bg-surface/80 p-3 sm:p-4"
              role="group"
              aria-label={t('adminProduction.productTypesAria')}
            >
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {selectableProducts.map((p) => {
                  const checked = selectedProductIds.includes(p.id);
                  return (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary-500"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm leading-snug text-ink">
                          <span className="font-medium">{p.name}</span>{' '}
                          <span className="text-muted">{p.variant}</span>
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
            {loading ? t('common.loading') : t('common.refresh')}
          </Button>
        </div>
      </Card>

      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}

      {loading && !data && <p className="text-muted">{t('common.loading')}</p>}

      {data && (
        <div className={`space-y-6 ${loading ? 'pointer-events-none opacity-60' : ''}`}>
          <Card>
            <p className="text-sm text-muted">
              {t('adminProduction.paidOrdersInPeriod', { count: data.totalOrders })}
              {data.pickupDateTo ? (
                <>
                  {' '}
                  ({data.pickupDate} → {data.pickupDateTo})
                </>
              ) : null}
            </p>
            <p className="mt-2 text-sm text-muted">
              {t('adminProduction.statusBreakdown', {
                received: data.statusCounts.RECEIVED ?? 0,
                ready: data.statusCounts.READY ?? 0,
                pickedUp: data.statusCounts.PICKED_UP ?? 0,
              })}
            </p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-lg font-semibold text-ink">
                {t('adminProduction.pendingProductsTitle')}
              </h2>
              <p className="mb-4 text-xs text-muted">{t('adminProduction.pendingProductsDesc')}</p>
              <ProductionQtyTable
                rows={data.productPendingTotals}
                emptyMessage={t('adminProduction.noPendingProducts')}
              />
            </Card>

            <Card>
              <h2 className="mb-1 text-lg font-semibold text-ink">
                {t('adminProduction.ordersPickupTitle')}
              </h2>
              <p className="mb-4 text-xs text-muted">{t('adminProduction.ordersPickupDesc')}</p>
              {data.totalOrders === 0 ? (
                <p className="text-sm text-muted">{t('adminProduction.noOrdersInPeriod')}</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3">{t('adminCommon.status')}</th>
                        <th className="px-4 py-3 text-right">{t('adminCommon.quantity')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5 font-medium text-ink">
                          {t('adminProduction.ordersNotPickedUp')}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-amber-800">
                          {data.ordersNotPickedUp}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5 font-medium text-ink">
                          {t('adminProduction.ordersPickedUp')}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-800">
                          {data.ordersPickedUp}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="border-t border-border bg-slate-50/80">
                      <tr>
                        <td className="px-4 py-2.5 text-sm font-semibold text-ink">
                          {t('common.total')}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-ink">
                          {data.totalOrders}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-1 text-lg font-semibold text-ink">{t('adminProduction.chartTitle')}</h2>
              <p className="mb-4 text-xs text-muted">{t('adminProduction.chartDesc')}</p>
              <BarChartByProduct items={chartItems} />
              {data.productTotals.length === 0 && (
                <p className="text-sm text-muted">{t('adminProduction.noLines')}</p>
              )}
            </Card>

            <Card>
              <h2 className="mb-1 text-lg font-semibold text-ink">{t('adminProduction.quickTable')}</h2>
              <p className="mb-4 text-xs text-muted">{t('adminProduction.quickTableDesc')}</p>
              <ul className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto text-sm">
                {data.productTotals.map((t, i) => (
                  <li key={i} className="flex justify-between gap-2 border-b border-border py-2 last:border-0">
                    <span className="text-ink">
                      {t.productName} <span className="text-muted">{t.variant}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-primary-800">{t.totalQuantity}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <h2 className="mb-1 text-lg font-semibold text-ink">{t('adminProduction.detailTitle')}</h2>
            <p className="mb-4 text-xs text-muted">{t('adminProduction.detailDesc')}</p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">{t('adminCommon.day')}</th>
                    <th className="px-4 py-3">{t('adminCommon.time')}</th>
                    <th className="px-4 py-3">{t('adminCommon.product')}</th>
                    <th className="px-4 py-3">{t('adminCommon.variant')}</th>
                    <th className="px-4 py-3 text-right">{t('adminCommon.quantity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.rows.map((r, i) => (
                    <tr key={`${r.pickupDate}-${r.pickupTime}-${i}`} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink">{r.pickupDate}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink">{r.pickupTime}</td>
                      <td className="px-4 py-2.5 font-medium text-ink">{r.productName}</td>
                      <td className="px-4 py-2.5 text-muted">{r.variant}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-primary-800">
                        {r.totalQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.rows.length === 0 && (
              <p className="mt-3 text-sm text-muted">{t('adminProduction.noDetailRows')}</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
