import { useCallback, useEffect, useMemo, useState } from 'react';
import { superApi, formatMoney, type SuperMetrics } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, SectionTitle } from '../../components/ui';
import { useI18n } from '../../i18n/context';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function BarChart({
  items,
  emptyLabel,
}: {
  items: Array<{ label: string; value: number; display: string }>;
  emptyLabel: string;
}) {
  const max = Math.max(1, ...items.map((x) => x.value));
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((row) => (
        <div key={row.label}>
          <div className="flex justify-between gap-2 text-xs text-ink">
            <span className="min-w-0 truncate font-medium" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 tabular-nums font-semibold">{row.display}</span>
          </div>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full min-w-[2px] rounded-full bg-gradient-to-r from-primary to-indigo-400"
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SuperDashboard() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [m, setM] = useState<SuperMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await superApi.metrics(token, dateFrom || undefined, dateTo || undefined);
      setM(data as SuperMetrics);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
      setM(null);
    } finally {
      setLoading(false);
    }
  }, [token, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} — ${dateTo}`;
    if (dateFrom) return `${t('superDashboard.from')} ${dateFrom}`;
    if (dateTo) return `${t('superDashboard.to')} ${dateTo}`;
    return t('superDashboard.allTime');
  }, [dateFrom, dateTo, t]);

  const topByRevenue = useMemo(() => {
    if (!m) return [];
    return m.lojaRanking
      .filter((l) => l.revenueCents > 0)
      .slice(0, 6)
      .map((l) => ({
        label: l.name,
        value: l.revenueCents,
        display: formatMoney(l.revenueCents),
      }));
  }, [m]);

  const applyPreset = (days: number | null) => {
    if (days === null) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    setDateFrom(daysAgoIso(days));
    setDateTo(new Date().toISOString().slice(0, 10));
  };

  return (
    <div>
      <SectionTitle title={t('superDashboard.title')} description={t('superDashboard.subtitle')} />

      <Card className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-md">
            <div>
              <Label>{t('superDashboard.dateFrom')}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>{t('superDashboard.dateTo')}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="text-sm" onClick={() => applyPreset(7)}>
              {t('superDashboard.last7Days')}
            </Button>
            <Button type="button" variant="secondary" className="text-sm" onClick={() => applyPreset(30)}>
              {t('superDashboard.last30Days')}
            </Button>
            <Button type="button" variant="secondary" className="text-sm" onClick={() => applyPreset(null)}>
              {t('superDashboard.allTime')}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          {t('superDashboard.period')}: <span className="font-medium text-ink">{periodLabel}</span>
        </p>
      </Card>

      {err && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {loading && !m && <p className="text-sm text-muted">{t('common.loading')}</p>}

      {m && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: t('superDashboard.lojas'),
                value: m.lojas.total,
                sub: t('superDashboard.lojasSub', {
                  active: String(m.lojas.active),
                  inactive: String(m.lojas.inactive),
                }),
              },
              {
                label: t('superDashboard.products'),
                value: m.products.total,
                sub: t('superDashboard.productsSub', { active: String(m.products.active) }),
              },
              {
                label: t('superDashboard.orders'),
                value: m.orders.total,
                sub: t('superDashboard.ordersSub', {
                  paid: String(m.orders.paid),
                  unpaid: String(m.orders.unpaid),
                }),
              },
              {
                label: t('superDashboard.revenue'),
                value: formatMoney(m.revenue.totalCents),
                sub: t('superDashboard.avgTicket', {
                  value: formatMoney(m.orders.averageTicketCents),
                }),
              },
            ].map((stat) => (
              <Card key={stat.label} hover>
                <p className="text-sm font-medium text-muted">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{stat.value}</p>
                {stat.sub && <p className="mt-1 text-xs text-muted">{stat.sub}</p>}
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h2 className="text-sm font-semibold text-ink">{t('superDashboard.recentActivity')}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('superDashboard.last7Days')}</dt>
                  <dd className="text-right tabular-nums text-ink">
                    {m.recent.last7Days.orders} {t('superDashboard.ordersShort')} ·{' '}
                    {formatMoney(m.recent.last7Days.revenueCents)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('superDashboard.last30Days')}</dt>
                  <dd className="text-right tabular-nums text-ink">
                    {m.recent.last30Days.orders} {t('superDashboard.ordersShort')} ·{' '}
                    {formatMoney(m.recent.last30Days.revenueCents)}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-ink">{t('superDashboard.orderStatus')}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                {(
                  [
                    ['RECEIVED', t('superDashboard.statusReceived')],
                    ['READY', t('superDashboard.statusReady')],
                    ['PICKED_UP', t('superDashboard.statusPickedUp')],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium tabular-nums text-ink">{m.orders.byStatus[key]}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-ink">{t('superDashboard.plansAndUsers')}</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">STARTER</dt>
                  <dd className="font-medium tabular-nums text-ink">{m.lojas.byPlan.STARTER}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">PRO</dt>
                  <dd className="font-medium tabular-nums text-ink">{m.lojas.byPlan.PRO}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">PREMIUM</dt>
                  <dd className="font-medium tabular-nums text-ink">{m.lojas.byPlan.PREMIUM}</dd>
                </div>
                <div className="mt-3 flex justify-between gap-3 border-t border-border pt-3">
                  <dt className="text-muted">{t('superDashboard.lojaAdmins')}</dt>
                  <dd className="font-medium tabular-nums text-ink">{m.users.lojaAdmins}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-2">
              <h2 className="text-sm font-semibold text-ink">{t('superDashboard.topRevenue')}</h2>
              <p className="mt-1 text-xs text-muted">{t('superDashboard.topRevenueDesc')}</p>
              <div className="mt-4">
                <BarChart items={topByRevenue} emptyLabel={t('superDashboard.noData')} />
              </div>
            </Card>

            <Card className="overflow-hidden xl:col-span-3">
              <h2 className="text-sm font-semibold text-ink">{t('superDashboard.lojaTable')}</h2>
              <p className="mt-1 text-xs text-muted">{t('superDashboard.lojaTableDesc')}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                      <th className="pb-2 pr-3 font-medium">{t('superDashboard.colLoja')}</th>
                      <th className="pb-2 pr-3 font-medium">{t('superDashboard.colPlan')}</th>
                      <th className="pb-2 pr-3 text-right font-medium">{t('superDashboard.colProducts')}</th>
                      <th className="pb-2 pr-3 text-right font-medium">{t('superDashboard.colOrders')}</th>
                      <th className="pb-2 pr-3 text-right font-medium">{t('superDashboard.colRevenue')}</th>
                      <th className="pb-2 text-right font-medium">{t('superDashboard.colAvgTicket')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.lojaRanking.map((loja) => (
                      <tr key={loja.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-ink">{loja.name}</p>
                          <p className="text-xs text-muted">
                            {loja.slug}
                            {!loja.active && ` · ${t('superDashboard.inactive')}`}
                            {loja.locality && ` · ${loja.locality}`}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 text-muted">{loja.plan}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{loja.products}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{loja.orders}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-medium">
                          {formatMoney(loja.revenueCents)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-muted">
                          {formatMoney(loja.averageTicketCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

