import { Store } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  lojaLabel: string;
  subtitle?: string;
};

/** Cabeçalho da loja — verde-água suave, fresco e legível. */
export function ShopPublicHeader({ lojaLabel, subtitle }: Props) {
  return (
    <header className="relative mb-8 max-w-full overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/60 shadow-[var(--shadow-card)]">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-teal-200/40 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-32 rounded-full bg-cyan-200/30 blur-2xl"
        aria-hidden
      />

      <div className="relative flex min-w-0 items-start justify-between gap-3 px-4 py-5 sm:gap-5 sm:px-7 sm:py-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div
            className="mt-0.5 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25 sm:flex sm:h-14 sm:w-14"
            aria-hidden
          >
            <Store className="h-6 w-6 sm:h-6 sm:w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-teal-600/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-teal-800">
              Peaksy
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-tight">
              {lojaLabel}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-md text-sm font-medium leading-relaxed text-teal-800/75">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <LanguageSwitcher className="mt-0.5" />
      </div>

      <div
        className="relative h-0.5 bg-gradient-to-r from-teal-400/70 via-cyan-400/60 to-teal-300/50"
        aria-hidden
      />
    </header>
  );
}
