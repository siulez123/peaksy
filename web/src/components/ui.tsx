import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'platform';
  children: ReactNode;
}) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all duration-200 ${focusRing} disabled:pointer-events-none disabled:opacity-50`;
  const heights = 'min-h-[2.75rem] py-2.5';
  const variants: Record<string, string> = {
    primary: `${heights} bg-primary text-white shadow-[var(--shadow-primary)] hover:bg-primary-hover hover:shadow-[0_6px_20px_rgb(79_70_229/0.35)] active:scale-[0.99]`,
    secondary: `${heights} border border-border bg-surface text-ink shadow-sm hover:border-slate-300 hover:bg-canvas`,
    ghost: `${heights} bg-transparent text-muted hover:bg-slate-100 hover:text-ink`,
    danger: `${heights} bg-red-600 text-white shadow-sm hover:bg-red-700`,
    platform: `${heights} bg-primary text-white shadow-[var(--shadow-primary)] hover:bg-primary-hover`,
  };
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6 ${
        hover ? 'transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full min-h-[2.75rem] rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${focusRing}`}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-ink">{children}</label>;
}

/** Título de secção para dashboards operacionais. */
export function SectionTitle({
  title,
  description,
  className = '',
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`mb-6 ${className}`.trim()}>
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.65rem]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  className = '',
  showLanguage = true,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  showLanguage?: boolean;
}) {
  return (
    <header className={`mb-8 sm:mb-10 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {showLanguage && <LanguageSwitcher className="mt-0.5 shrink-0" />}
      </div>
    </header>
  );
}

export function PageFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-8 ${className}`.trim()}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted">Peaksy</p>
      <LanguageSwitcher variant="footer" />
    </footer>
  );
}

export function SheetDialog({
  open,
  onClose,
  title,
  titleId,
  children,
  maxWidthClassName = 'max-w-md',
  closeDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  maxWidthClassName?: string;
  closeDisabled?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !closeDisabled) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDisabled, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => !closeDisabled && onClose()}
        aria-label="Fechar"
      />
      <div
        className={`relative max-h-[min(92dvh,720px)] w-full ${maxWidthClassName} overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-4 backdrop-blur-md sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            onClick={() => !closeDisabled && onClose()}
            disabled={closeDisabled}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
