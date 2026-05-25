import { Sparkles } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  lojaLabel: string;
  subtitle?: string;
};

/** Cabeçalho da loja — tom claro, acolhedor, com detalhe decorativo. */
export function ShopPublicHeader({ lojaLabel, subtitle }: Props) {
  return (
    <header className="relative mb-8 max-w-full overflow-hidden rounded-2xl border border-amber-100/90 bg-gradient-to-br from-amber-50/80 via-white to-indigo-50/50 shadow-[var(--shadow-card)] ring-1 ring-white/80">
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-amber-200/50 to-orange-100/30 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgb(251 191 36 / 0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
        aria-hidden
      />

      <div className="relative flex min-w-0 items-start justify-between gap-3 px-4 py-5 sm:gap-5 sm:px-7 sm:py-7">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div
            className="mt-0.5 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-indigo-500 to-violet-500 text-white shadow-[var(--shadow-primary)] sm:flex sm:h-14 sm:w-14"
            aria-hidden
          >
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-primary shadow-sm ring-1 ring-primary/10">
              Peaksy
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem] sm:leading-tight">
              {lojaLabel}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-md text-sm font-medium leading-relaxed text-amber-900/70 sm:text-[0.9375rem]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <LanguageSwitcher className="mt-0.5" />
      </div>

      <div
        className="relative h-1 bg-gradient-to-r from-amber-300/80 via-primary/70 to-indigo-400/60"
        aria-hidden
      />
    </header>
  );
}
