import { LanguageSwitcher } from './LanguageSwitcher';

type Props = {
  bakeryLabel: string;
  subtitle?: string;
};

/** Cabeçalho da loja com banda escura de alto contraste e idioma à direita. */
export function ShopPublicHeader({ bakeryLabel, subtitle }: Props) {
  return (
    <header className="mb-6 overflow-hidden rounded-2xl bg-ink shadow-xl shadow-ink/20">
      <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">Peaksy</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{bakeryLabel}</h1>
          {subtitle && (
            <p className="mt-2 text-sm font-semibold text-accent-soft">{subtitle}</p>
          )}
        </div>
        <LanguageSwitcher variant="dark" className="mt-0.5" />
      </div>
    </header>
  );
}
