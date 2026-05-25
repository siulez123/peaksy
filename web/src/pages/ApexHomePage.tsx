import { Link } from 'react-router-dom';
import { Crown, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/context';

export function ApexHomePage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
      <div className="mb-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-sm">
            P
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">Peaksy</span>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="text-center sm:text-left">
        <p className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-text">
          {t('apex.tagline')}
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl sm:leading-tight">
          {t('apex.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:mx-0">
          {t('apex.intro', { example: 'lojademo.peaksy.com' })}
        </p>
      </div>

      <Card className="mt-10 border-primary/10 bg-gradient-to-br from-primary-soft/50 to-surface" hover>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[var(--shadow-primary)]">
              <Crown className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-ink">{t('apex.platformAdmin')}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t('apex.platformAdminDesc')}</p>
            </div>
          </div>
          <Link
            to="/super/entrar"
            className="inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all duration-200 hover:bg-primary-hover hover:shadow-[0_6px_20px_rgb(79_70_229/0.35)]"
          >
            {t('apex.signIn')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>

      <p className="mt-10 text-center text-sm text-muted sm:text-left">
        <span className="text-slate-400">{t('apex.devPickSlug')}</span>{' '}
        <Link to="/loja" className="font-medium text-primary transition-colors hover:text-primary-hover">
          {t('apex.devPickSlugLink')}
        </Link>
      </p>
    </div>
  );
}
