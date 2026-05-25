import { Button } from './ui';
import { useCookieConsent } from '../context/CookieConsentContext';
import { useI18n } from '../i18n/context';

/** Aviso de cookies (RGPD) — barra fixa discreta até o utilizador escolher. */
export function CookieBanner() {
  const { consent, accept, reject } = useCookieConsent();
  const { t } = useI18n();

  if (consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookies.title')}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-4 py-3 shadow-[0_-4px_24px_rgb(15_23_42/0.08)] backdrop-blur-sm sm:px-6"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-snug text-muted">{t('cookies.message')}</p>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="ghost" className="!min-h-9 !px-4 !py-2 text-sm" onClick={reject}>
            {t('cookies.reject')}
          </Button>
          <Button type="button" className="!min-h-9 !px-4 !py-2 text-sm" onClick={accept}>
            {t('cookies.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
