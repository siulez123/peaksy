import { useEffect, useState } from 'react';
import { superApi, formatMoney } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui';
import { useI18n } from '../../i18n/context';

type Metrics = {
  bakeries: { total: number; active: number };
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
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">{t('superDashboard.title')}</h1>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {m && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-stone-500">Padarias</p>
            <p className="mt-1 text-2xl font-semibold">{m.bakeries.total}</p>
            <p className="text-xs text-stone-400">Ativas: {m.bakeries.active}</p>
          </Card>
          <Card>
            <p className="text-sm text-stone-500">Utilizadores</p>
            <p className="mt-1 text-2xl font-semibold">{m.users.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-stone-500">Pedidos</p>
            <p className="mt-1 text-2xl font-semibold">{m.orders.total}</p>
          </Card>
          <Card>
            <p className="text-sm text-stone-500">Receita (pago)</p>
            <p className="mt-1 text-2xl font-semibold">{formatMoney(m.revenue.totalCents)}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
