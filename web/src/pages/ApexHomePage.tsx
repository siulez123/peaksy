import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Card } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/context';

/** Página inicial do domínio principal (sem subdomínio de tenant): orientação e super admin. */
export function ApexHomePage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <div className="mb-10 flex items-center justify-between gap-4">
        <span className="text-lg font-extrabold tracking-tight text-ink">Peaksy</span>
        <LanguageSwitcher />
      </div>

      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">{t('apex.tagline')}</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{t('apex.title')}</h1>
        <p className="mt-4 text-base font-medium leading-relaxed text-muted">
          {t('apex.intro', { example: 'lojademo.peaksy.com' })}
        </p>
      </div>

      <Card className="mt-10 border-platform/20 bg-platform-soft/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-platform text-white shadow-md">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-ink">{t('apex.platformAdmin')}</h2>
              <p className="mt-1 text-sm font-medium text-muted">{t('apex.platformAdminDesc')}</p>
            </div>
          </div>
          <Link
            to="/super/entrar"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-platform px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-platform-hover"
          >
            {t('apex.signIn')}
          </Link>
        </div>
      </Card>

      <p className="mt-10 text-center text-sm font-medium text-muted">
        <span className="text-zinc-400">{t('apex.devPickSlug')}</span>{' '}
        <Link to="/loja" className="font-bold text-accent hover:underline">
          {t('apex.devPickSlugLink')}
        </Link>
      </p>
    </div>
  );
}
