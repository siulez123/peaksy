import { useI18n, LOCALE_FLAGS, type Locale } from '../i18n/context';

const LOCALES: Locale[] = ['en', 'fr', 'pt'];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-stone-600">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="cursor-pointer rounded-lg border border-stone-200 bg-white py-1.5 pl-2 pr-8 text-sm font-medium text-stone-800 shadow-sm transition hover:border-stone-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
