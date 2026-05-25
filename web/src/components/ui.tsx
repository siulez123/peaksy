import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'platform';
  children: ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50';
  const variants: Record<string, string> = {
    primary: 'bg-accent text-white shadow-md shadow-accent/25 hover:bg-accent-hover',
    secondary: 'border-2 border-ink/10 bg-surface text-ink hover:border-ink/20 hover:bg-canvas',
    ghost: 'bg-transparent text-ink hover:bg-canvas',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    platform: 'bg-platform text-white shadow-md hover:bg-platform-hover',
  };
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border-2 border-ink/5 bg-surface p-4 shadow-lg shadow-ink/5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-xl border-2 border-border bg-surface px-3 py-2.5 font-medium text-ink placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-sm font-semibold text-ink">{children}</label>;
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
    <header className={`mb-6 sm:mb-8 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-base font-medium text-muted">{subtitle}</p>}
        </div>
        {showLanguage && <LanguageSwitcher className="mt-1" />}
      </div>
    </header>
  );
}

/** Rodapé mínimo para páginas sem layout (login, 404, mensagens). */
export function PageFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t-2 border-ink/5 px-4 py-6 ${className}`.trim()}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Peaksy</p>
      <LanguageSwitcher variant="footer" />
    </footer>
  );
}

/** Folha modal alinhada ao checkout da loja e ao login no rodapé (overlay, cantos, cabeçalho com X). */
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
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={() => !closeDisabled && onClose()}
        aria-label="Fechar"
      />
      <div
        className={`relative max-h-[min(92dvh,720px)] w-full ${maxWidthClassName} overflow-y-auto overscroll-contain rounded-t-2xl border-2 border-ink/10 bg-surface shadow-2xl sm:rounded-2xl`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b-2 border-ink/5 bg-surface px-4 py-3 sm:px-6">
          <h2 id={titleId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-xl p-2 text-muted hover:bg-canvas hover:text-ink"
            onClick={() => !closeDisabled && onClose()}
            disabled={closeDisabled}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
