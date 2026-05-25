import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useHostTenantSlug } from '../../lib/tenantHost';
import { shopHomePath, orderSuccessSearchParams } from '../../lib/shopPaths';
import { XCircle } from 'lucide-react';
import { Card } from '../../components/ui';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useI18n } from '../../i18n/context';

/** Redireciona URLs antigas `/sucesso` para a loja com query `order_id` (modal na ShopPage). */
export function ShopSuccessRedirect() {
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = slugParam ?? hostSlug ?? '';
  const [sp] = useSearchParams();
  const target =
    shopHomePath(slug, hostSlug) +
    orderSuccessSearchParams(sp.get('order_id'), sp.get('session_id'));
  return <Navigate to={target} replace />;
}

export function ShopCancelPage() {
  const { t } = useI18n();
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = slugParam ?? hostSlug ?? '';
  const shopHome = shopHomePath(slug, hostSlug);
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="text-center">
        <XCircle className="mx-auto h-14 w-14 text-warning" />
        <h1 className="mt-4 text-xl font-semibold text-ink">{t('shopMessages.cancelTitle')}</h1>
        <p className="mt-2 text-sm text-muted">{t('shopMessages.cancelBody')}</p>
        <Link
          to={shopHome}
          replace
          className="mt-6 inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover"
        >
          {t('shopMessages.backToShop')}
        </Link>
      </Card>
    </div>
  );
}
