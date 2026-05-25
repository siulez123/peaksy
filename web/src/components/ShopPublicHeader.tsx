import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  lojaLabel: string;
  subtitle?: string;
};

/** Cabeçalho da loja — gradiente slate premium com leve blur. */
export function ShopPublicHeader({ lojaLabel, subtitle }: Props) {
  return (
    <header className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 shadow-lg shadow-slate-900/15 ring-1 ring-white/10">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-60"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-6 px-6 py-6 sm:px-8 sm:py-7">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Peaksy</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{lojaLabel}</h1>
          {subtitle && (
            <p className="mt-2 text-sm font-medium text-indigo-200/90">{subtitle}</p>
          )}
        </div>
        <LanguageSwitcher variant="dark" className="mt-1 shrink-0" />
      </div>
    </header>
  );
}
