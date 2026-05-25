import { useI18n, LOCALE_FLAGS, type Locale } from '../i18n/context';

const LOCALES: Locale[] = ['en', 'fr', 'pt'];

const groupClass: Record<'default' | 'dark' | 'footer', string> = {
  default: 'rounded-lg border border-border bg-surface p-0.5 shadow-sm',
  dark: 'rounded-lg border border-white/15 bg-white/5 p-0.5 backdrop-blur-md',
  footer: 'rounded-lg border border-border bg-canvas p-0.5',
};

const btnClass: Record<'default' | 'dark' | 'footer', { base: string; active: string }> = {
  default: {
    base: 'text-base leading-none text-muted transition-colors hover:bg-canvas hover:text-ink',
    active: 'bg-primary-soft text-ink shadow-sm',
  },
  dark: {
    base: 'text-base leading-none text-white/50 transition-colors hover:bg-white/10 hover:text-white',
    active: 'bg-white/15 text-white shadow-sm',
  },
  footer: {
    base: 'text-sm leading-none text-muted transition-colors hover:bg-surface hover:text-ink',
    active: 'bg-surface text-ink shadow-sm ring-1 ring-border',
  },
};

type Props = {
  variant?: keyof typeof groupClass;
  className?: string;
};

export function LanguageSwitcher({ variant = 'default', className = '' }: Props) {
  const { locale, setLocale, t } = useI18n();
  const styles = btnClass[variant];

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`inline-flex shrink-0 items-center gap-0.5 ${groupClass[variant]} ${className}`.trim()}
    >
      {LOCALES.map((loc) => {
        const active = locale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            aria-label={t(`lang.${loc}`)}
            aria-pressed={active}
            title={t(`lang.${loc}`)}
            className={`rounded-md px-2 py-1.5 ${styles.base} ${active ? styles.active : ''}`}
          >
            <span aria-hidden="true">{LOCALE_FLAGS[loc]}</span>
          </button>
        );
      })}
    </div>
  );
}
