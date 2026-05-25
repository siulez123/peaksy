import { useEffect, useState } from 'react';
import { superApi, formatMoney } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, SectionTitle } from '../../components/ui';
import { useI18n } from '../../i18n/context';

type Metrics = {
  lojas: { total: number; active: number };
  users: { total: number };
  orders: { total: number };
  revenue: { totalCents: number };
};

export function SuperDashboard() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [m, setM] = useState<Metrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let c = false;
    (async () => {
      try {
        const data = (await superApi.metrics(token)) as Metrics;
        if (!c) setM(data);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Erro');
      }
    })();
    return () => {
      c = true;
    };
  }, [token]);

  return (
    <div>
      <SectionTitle title={t('superDashboard.title')} />
      {err && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      {m && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Lojas', value: m.lojas.total, sub: `Ativas: ${m.lojas.active}` },
            { label: 'Utilizadores', value: m.users.total },
            { label: 'Pedidos', value: m.orders.total },
            { label: 'Receita (pago)', value: formatMoney(m.revenue.totalCents) },
          ].map((stat) => (
            <Card key={stat.label} hover>
              <p className="text-sm font-medium text-muted">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{stat.value}</p>
              {stat.sub && <p className="mt-1 text-xs text-muted">{stat.sub}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
