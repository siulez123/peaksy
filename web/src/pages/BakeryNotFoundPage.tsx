import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Card } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useHostTenantSlug } from '../lib/tenantHost';
import { useI18n } from '../i18n/context';

/** Loja inexistente ou inativa (slug inválido). */
export function BakeryNotFoundPage({ slug }: { slug: string }) {
  const hostSlug = useHostTenantSlug();
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="text-center">
        <Store className="mx-auto h-14 w-14 text-amber-500/90" strokeWidth={1.25} />
        <h1 className="mt-5 text-xl font-extrabold text-ink">{t('bakeryNotFound.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t('bakeryNotFound.desc', { slug })}</p>
        {hostSlug ? (
          <p className="mt-4 text-xs text-muted">{t('bakeryNotFound.hostHint')}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
          >
            {t('bakeryNotFound.peaksyHome')}
          </Link>
          {!hostSlug && (
            <Link
              to="/loja"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
            >
              {t('bakeryNotFound.pickAnother')}
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
