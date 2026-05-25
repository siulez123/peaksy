import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Card } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { platformHomeHref, useHostTenantSlug } from '../lib/tenantHost';
import { useI18n } from '../i18n/context';

/** Loja inexistente ou inativa (slug inválido). */
export function LojaNotFoundPage({ slug }: { slug: string }) {
  const hostSlug = useHostTenantSlug();
  const { t } = useI18n();
  const peaksyHomeHref = platformHomeHref();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>
      <Card className="text-center">
        <Store className="mx-auto h-14 w-14 text-slate-300" strokeWidth={1.25} />
        <h1 className="mt-4 text-xl font-semibold text-ink">{t('lojaNotFound.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t('lojaNotFound.desc', { slug })}</p>
        {hostSlug ? (
          <p className="mt-4 text-xs text-muted">{t('lojaNotFound.hostHint')}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href={peaksyHomeHref}
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover"
          >
            {t('lojaNotFound.peaksyHome')}
          </a>
          {!hostSlug && (
            <Link
              to="/loja"
              className="inline-flex min-h-[2.75rem] items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
            >
              {t('lojaNotFound.pickAnother')}
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
