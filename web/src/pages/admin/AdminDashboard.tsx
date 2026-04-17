import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui';

export function AdminDashboard() {
  const { slug = '' } = useParams();
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
          <Link to={`/admin/${slug}/pedidos`} className="mt-3 inline-block text-sm text-orange-600 hover:underline">
            Ver pedidos
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-stone-500">Atalhos</p>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <Link to={`/admin/${slug}/produtos`} className="text-orange-600 hover:underline">
                Gerir produtos
              </Link>
            </li>
            <li>
              <Link to={`/admin/${slug}/dias`} className="text-orange-600 hover:underline">
                Dias de levantamento
              </Link>
            </li>
            <li>
              <Link to={`/admin/${slug}/producao`} className="text-orange-600 hover:underline">
                Folha de produção
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
