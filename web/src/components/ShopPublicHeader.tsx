import { LanguageSwitcher } from './LanguageSwitcher';
import { PeaksyLogoMark } from './PeaksyLogoMark';

type Props = {
  lojaLabel: string;
  subtitle?: string;
};

/** Cabeçalho da loja — fundo claro com acentos da paleta da loja. */
export function ShopPublicHeader({ lojaLabel, subtitle }: Props) {
  return (
    <header className="relative mb-8 max-w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-soft via-surface to-canvas shadow-sm ring-1 ring-primary/10">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 left-1/3 h-28 w-48 rounded-full bg-primary/8 blur-2xl"
        aria-hidden
      />

      <div className="relative flex min-w-0 items-start justify-between gap-3 px-4 py-5 sm:gap-5 sm:px-7 sm:py-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div
            className="mt-0.5 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm ring-1 ring-primary/15 sm:flex sm:h-14 sm:w-14"
            aria-hidden
          >
            <PeaksyLogoMark size={36} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-primary-soft-text ring-1 ring-primary/20">
              Peaksy
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem] sm:leading-tight">
              {lojaLabel}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-md text-sm font-medium leading-relaxed text-muted">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <LanguageSwitcher className="mt-0.5 shrink-0" />
      </div>

      <div
        className="relative h-0.5 bg-gradient-to-r from-primary/70 via-primary to-primary/40"
        aria-hidden
      />
    </header>
  );
}
