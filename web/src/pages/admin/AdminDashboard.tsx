import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui';
import { useAdminPathBase, useResolvedTenantSlug } from '../../lib/tenantHost';

export function AdminDashboard() {
  const slug = useResolvedTenantSlug();
  const base = useAdminPathBase();
  const { token } = useAuth();
  const [orders, setOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let c = false;
    (async () => {
      try {
        const list = await adminApi.orders.list(token, slug);
        if (!c) setOrders(list.length);
      } catch {
        if (!c) setOrders(0);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [token, slug]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Resumo</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-stone-500">Pedidos (lista atual)</p>
          <p className="mt-1 text-3xl font-semibold text-stone-900">{loading ? '…' : orders}</p>
          <Link to={`${base}/pedidos`} className="mt-3 inline-block text-sm text-orange-600 hover:underline">
            Ver pedidos
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-stone-500">Atalhos</p>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <Link to={`${base}/produtos`} className="text-orange-600 hover:underline">
                Gerir produtos
              </Link>
            </li>
            <li>
              <Link to={`${base}/dias`} className="text-orange-600 hover:underline">
                Dias de levantamento
              </Link>
            </li>
            <li>
              <Link to={`${base}/producao`} className="text-orange-600 hover:underline">
                Folha de produção
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
