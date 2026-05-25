import { LanguageSwitcher } from './LanguageSwitcher';
import { PeaksyLogoMark } from './PeaksyLogoMark';

type Props = {
  lojaLabel: string;
  subtitle?: string;
};

/** Cabeçalho da loja — paleta Peaksy (navy #0F172A, primary #4F46E5, Inter). */
export function ShopPublicHeader({ lojaLabel, subtitle }: Props) {
  return (
    <header className="relative mb-8 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink via-[#141c2e] to-[#1e1b4b] shadow-[0_4px_24px_rgb(15_23_42/0.28)]">
      <div
        className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary/35 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-1/4 h-32 w-56 rounded-full bg-primary-hover/25 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/3 top-1/2 h-20 w-20 rounded-full bg-primary/15 blur-xl"
        aria-hidden
      />

      <div className="relative flex min-w-0 items-start justify-between gap-3 px-4 py-5 sm:gap-5 sm:px-7 sm:py-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div
            className="mt-0.5 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 shadow-[var(--shadow-primary)] sm:flex sm:h-14 sm:w-14"
            aria-hidden
          >
            <PeaksyLogoMark size={36} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/25 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-indigo-100 ring-1 ring-primary/30">
              Peaksy
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem] sm:leading-tight">
              {lojaLabel}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-md text-sm font-medium leading-relaxed text-slate-300">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <LanguageSwitcher variant="dark" className="mt-0.5 shrink-0" />
      </div>

      <div
        className="relative h-0.5 bg-gradient-to-r from-primary via-primary-hover to-primary/40"
        aria-hidden
      />
    </header>
  );
}
