import { LanguageSwitcher } from './LanguageSwitcher';

/** Barra fixa no topo com seletor de idioma (bandeiras). */
export function LanguageBar() {
  return (
    <div
      className="sticky top-0 z-[100] border-b border-stone-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      role="banner"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-end px-4 py-2">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
