import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ClipboardList, Factory, Package } from 'lucide-react';
import { BrandIcon } from '../../components/BrandIcon';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, SectionTitle } from '../../components/ui';
import { useAdminPathBase, useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

export function AdminDashboard() {
  const { t } = useI18n();
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
      <SectionTitle title={t('adminDashboard.title')} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Card hover className="relative overflow-hidden">
          <div className="absolute right-4 top-4">
            <BrandIcon icon={ClipboardList} size="sm" />
          </div>
          <p className="text-sm font-medium text-muted">{t('adminDashboard.ordersCount')}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-ink tabular-nums">
            {loading ? '…' : orders}
          </p>
          <Link
            to={`${base}/pedidos`}
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            {t('adminDashboard.viewOrders')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
        <Card>
          <p className="text-sm font-medium text-muted">{t('adminDashboard.shortcuts')}</p>
          <ul className="mt-4 space-y-3">
            {[
              { to: `${base}/produtos`, label: t('adminDashboard.manageProducts'), icon: Package },
              { to: `${base}/dias`, label: t('adminDashboard.pickupDays'), icon: CalendarDays },
              { to: `${base}/producao`, label: t('adminDashboard.productionSheet'), icon: Factory },
            ].map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm font-medium text-ink transition-all hover:border-border hover:bg-slate-50"
                >
                  <BrandIcon icon={item.icon} size="sm" />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
