import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useHostTenantSlug } from '../../lib/tenantHost';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui';
import { useI18n } from '../../i18n/context';

export function ShopSuccessPage() {
  const { t } = useI18n();
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = slugParam ?? hostSlug ?? '';
  const shopHome = hostSlug ? '/' : `/loja/${slug}`;
  const [sp] = useSearchParams();
  const session = sp.get('session_id');
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Card>
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="mt-4 text-xl font-semibold text-stone-900">{t('shopMessages.successTitle')}</h1>
        <p className="mt-2 text-stone-600">{t('shopMessages.successBody')}</p>
        {session && (
          <p className="mt-2 break-all font-mono text-xs text-stone-400">
            {t('shopMessages.session')} {session}
          </p>
        )}
        <Link
          to={shopHome}
          className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          {t('shopMessages.backToShop')}
        </Link>
      </Card>
    </div>
  );
}

export function ShopCancelPage() {
  const { t } = useI18n();
  const { slug: slugParam } = useParams();
  const hostSlug = useHostTenantSlug();
  const slug = slugParam ?? hostSlug ?? '';
  const shopHome = hostSlug ? '/' : `/loja/${slug}`;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Card>
        <XCircle className="mx-auto h-14 w-14 text-amber-600" />
        <h1 className="mt-4 text-xl font-semibold text-stone-900">{t('shopMessages.cancelTitle')}</h1>
        <p className="mt-2 text-stone-600">{t('shopMessages.cancelBody')}</p>
        <Link
          to={shopHome}
          className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          {t('shopMessages.backToShop')}
        </Link>
      </Card>
    </div>
  );
}
