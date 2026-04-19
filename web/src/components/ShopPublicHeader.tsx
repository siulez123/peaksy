type Props = {
  bakeryLabel: string;
  subtitle?: string;
};

/** Cabeçalho da loja: só nome e subtítulo. Login de administradores está no rodapé. */
export function ShopPublicHeader({ bakeryLabel, subtitle }: Props) {
  return (
    <header className="mb-4 border-b border-stone-200/80 pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{bakeryLabel}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
      </div>
    </header>
  );
}
