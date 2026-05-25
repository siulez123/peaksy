import { useI18n, LOCALE_FLAGS, type Locale } from '../i18n/context';

const LOCALES: Locale[] = ['en', 'fr', 'pt'];

const selectClass: Record<'default' | 'dark' | 'footer', string> = {
  default:
    'cursor-pointer rounded-lg border border-border bg-surface py-1.5 pl-2.5 pr-8 text-sm font-semibold text-ink shadow-sm transition hover:border-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft',
  dark:
    'cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 py-1.5 pl-2.5 pr-8 text-sm font-semibold text-white shadow-sm transition hover:border-zinc-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40',
  footer:
    'cursor-pointer rounded-md border border-border bg-canvas py-1 pl-2 pr-7 text-xs font-semibold text-ink transition hover:bg-surface focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft',
};

type Props = {
  /** Estilo conforme o fundo onde o controlo aparece. */
  variant?: keyof typeof selectClass;
  className?: string;
};

export function LanguageSwitcher({ variant = 'default', className = '' }: Props) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={`inline-flex shrink-0 items-center ${className}`.trim()}>
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={selectClass[variant]}
        aria-label="Language"
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_FLAGS[loc]} {t(`lang.${loc}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
