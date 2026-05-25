import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useHostTenantSlug } from '../../lib/tenantHost';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
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
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h1 className="mt-4 text-xl font-extrabold text-ink">{t('shopMessages.successTitle')}</h1>
        <p className="mt-2 font-medium text-muted">{t('shopMessages.successBody')}</p>
        {session && (
          <p className="mt-2 break-all font-mono text-xs text-stone-400">
            {t('shopMessages.session')} {session}
          </p>
        )}
        <Link
          to={shopHome}
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-accent-hover"
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
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="text-center">
        <XCircle className="mx-auto h-14 w-14 text-amber-600" />
        <h1 className="mt-4 text-xl font-extrabold text-ink">{t('shopMessages.cancelTitle')}</h1>
        <p className="mt-2 font-medium text-muted">{t('shopMessages.cancelBody')}</p>
        <Link
          to={shopHome}
          className="mt-6 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-accent-hover"
        >
          {t('shopMessages.backToShop')}
        </Link>
      </Card>
    </div>
  );
}
