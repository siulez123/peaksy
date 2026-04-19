import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  children: ReactNode;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-50';
  const variants: Record<string, string> = {
    primary: 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm',
    secondary: 'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50',
    ghost: 'bg-transparent text-stone-700 hover:bg-stone-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
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
      className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-stone-900 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-stone-600">{children}</label>;
}

export function PageHeader({
  title,
  subtitle,
  className = '',
}: {
  title: string;
  subtitle?: string;
  /** Classes extra no header (ex.: margens). */
  className?: string;
}) {
  return (
    <header className={`mb-6 sm:mb-8 ${className}`.trim()}>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
    </header>
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
        className="absolute inset-0 bg-black/50"
        onClick={() => !closeDisabled && onClose()}
        aria-label="Fechar"
      />
      <div
        className={`relative max-h-[min(92dvh,720px)] w-full ${maxWidthClassName} overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-200 bg-white shadow-2xl sm:rounded-2xl`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-stone-900">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
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
