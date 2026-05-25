import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, type Messages } from './locales/en';
import { fr } from './locales/fr';
import { pt } from './locales/pt';

export type Locale = 'en' | 'fr' | 'pt';

const STORAGE_KEY = 'peaksy_locale';

const catalogs: Record<Locale, Messages> = { en, fr, pt };

export const LOCALE_TAGS: Record<Locale, string> = {
  en: 'en-GB',
  fr: 'fr-FR',
  pt: 'pt-PT',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  pt: '🇵🇹',
};

function readStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'fr' || v === 'pt') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

function getByPath(obj: Messages | typeof en, path: string): string | undefined {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
  );
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeTag: string;
  formatDateTime: (value: Date | string | number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const localeTag = LOCALE_TAGS[locale];

  useEffect(() => {
    document.documentElement.lang = localeTag;
  }, [localeTag]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = getByPath(catalogs[locale], key) ?? getByPath(catalogs.en, key) ?? key;
      return interpolate(raw, vars);
    },
    [locale]
  );

  const formatDateTime = useCallback(
    (value: Date | string | number) => {
      const d = value instanceof Date ? value : new Date(value);
      return d.toLocaleString(localeTag);
    },
    [localeTag]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, localeTag, formatDateTime }),
    [locale, setLocale, t, localeTag, formatDateTime]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
