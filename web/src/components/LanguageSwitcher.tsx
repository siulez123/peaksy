import { useEffect, useId, useRef, useState } from 'react';
import { useI18n, LOCALE_FLAGS, type Locale } from '../i18n/context';

const LOCALES: Locale[] = ['en', 'fr', 'pt'];

const triggerClass: Record<'default' | 'dark' | 'footer', string> = {
  default:
    'border-border bg-surface text-ink shadow-sm hover:border-primary/30 hover:bg-primary-soft/40',
  dark: 'border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/15',
  footer: 'border-border bg-canvas text-ink hover:bg-surface',
};

const menuClass: Record<'default' | 'dark' | 'footer', string> = {
  default: 'border-border bg-surface shadow-lg',
  dark: 'border-white/15 bg-slate-900/95 shadow-xl backdrop-blur-md',
  footer: 'border-border bg-surface shadow-lg',
};

const itemClass: Record<'default' | 'dark' | 'footer', { base: string; active: string }> = {
  default: {
    base: 'text-ink hover:bg-slate-50',
    active: 'bg-primary-soft ring-1 ring-primary/15',
  },
  dark: {
    base: 'text-white hover:bg-white/10',
    active: 'bg-white/15 ring-1 ring-white/20',
  },
  footer: {
    base: 'text-ink hover:bg-canvas',
    active: 'bg-canvas ring-1 ring-border',
  },
};

type Props = {
  variant?: keyof typeof triggerClass;
  className?: string;
};

export function LanguageSwitcher({ variant = 'default', className = '' }: Props) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const styles = itemClass[variant];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (loc: Locale) => {
    setLocale(loc);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`.trim()}>
      <button
        type="button"
        aria-label={t('lang.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={t(`lang.${locale}`)}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-base leading-none transition-colors ${triggerClass[variant]}`}
      >
        <span aria-hidden="true">{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('lang.label')}
          className={`absolute right-0 top-full z-[100] mt-1 flex w-8 flex-col gap-0.5 rounded-lg border p-1 ${menuClass[variant]}`}
        >
          {LOCALES.map((loc) => {
            const active = locale === loc;
            return (
              <li key={loc} role="option" aria-selected={active}>
                <button
                  type="button"
                  aria-label={t(`lang.${loc}`)}
                  title={t(`lang.${loc}`)}
                  onClick={() => pick(loc)}
                  className={`flex h-7 w-full items-center justify-center rounded-md text-base leading-none transition-colors ${styles.base} ${active ? styles.active : ''}`}
                >
                  <span aria-hidden="true">{LOCALE_FLAGS[loc]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
