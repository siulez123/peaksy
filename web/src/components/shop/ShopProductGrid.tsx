import { ImageIcon, Minus, Plus } from 'lucide-react';
import { formatMoney, productImageUrl } from '../../api';
import { Button } from '../ui';
export type ShopProduct = {
  id: string;
  name: string;
  variant: string;
  priceCents: number;
  imageUrl: string | null;
};

export type ProductDisplayLayout = 'LARGE' | 'MEDIUM' | 'SMALL';

type CartLine = {
  productId: string;
  name: string;
  variant: string;
  priceCents: number;
  qty: number;
};

type Props = {
  layout: ProductDisplayLayout;
  products: ShopProduct[];
  cart: Record<string, CartLine>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onAdd: (p: ShopProduct) => void;
  onSetQty: (productId: string, qty: number) => void;
};

function QtyControls({
  productId,
  qty,
  t,
  onAdd,
  onSetQty,
}: {
  productId: string;
  qty: number;
  t: Props['t'];
  onAdd: () => void;
  onSetQty: (productId: string, qty: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 sm:gap-3">
      <button
        type="button"
        className="rounded-lg border border-border p-1.5 hover:bg-canvas sm:p-2"
        onClick={() => onSetQty(productId, qty - 1)}
        aria-label={t('shop.minusOne')}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums sm:min-w-[2.5rem] sm:text-base">
        {qty}
      </span>
      <button
        type="button"
        className="rounded-lg border border-border p-1.5 hover:bg-canvas sm:p-2"
        onClick={onAdd}
        aria-label={t('shop.plusOne')}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProductImage({
  product,
  t,
  className,
  iconClassName,
}: {
  product: ShopProduct;
  t: Props['t'];
  className: string;
  iconClassName?: string;
}) {
  const img = productImageUrl(product.imageUrl);
  if (img) {
    return (
      <img
        src={img}
        alt={`${product.name} ${product.variant}`}
        className={className}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`flex flex-col items-center justify-center gap-1 text-muted ${className}`}>
      <ImageIcon className={iconClassName ?? 'h-10 w-10 opacity-60'} strokeWidth={1.25} />
      <span className="text-[10px] sm:text-xs">{t('shop.noImage')}</span>
    </div>
  );
}

function AddOrQty({
  product,
  cart,
  t,
  onAdd,
  onSetQty,
  buttonClassName,
}: {
  product: ShopProduct;
  cart: Record<string, CartLine>;
  t: Props['t'];
  onAdd: (p: ShopProduct) => void;
  onSetQty: (productId: string, qty: number) => void;
  buttonClassName?: string;
}) {
  const line = cart[product.id];
  if (line) {
    return (
      <QtyControls
        productId={product.id}
        qty={line.qty}
        t={t}
        onAdd={() => onAdd(product)}
        onSetQty={onSetQty}
      />
    );
  }
  return (
    <Button
      type="button"
      variant="secondary"
      className={buttonClassName ?? 'w-full !py-2 text-sm font-medium'}
      onClick={() => onAdd(product)}
    >
      {t('shop.addToCart')}
    </Button>
  );
}

export function ShopProductGrid({ layout, products, cart, t, onAdd, onSetQty }: Props) {
  if (layout === 'SMALL') {
    return (
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-canvas sm:h-20 sm:w-20">
              <ProductImage
                product={p}
                t={t}
                className="h-full w-full object-cover"
                iconClassName="h-8 w-8"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink leading-snug">{p.name}</p>
              <p className="text-sm text-muted">{p.variant}</p>
              <p className="mt-1 text-base font-semibold text-primary">{formatMoney(p.priceCents)}</p>
            </div>
            <AddOrQty product={p} cart={cart} t={t} onAdd={onAdd} onSetQty={onSetQty} />
          </li>
        ))}
      </ul>
    );
  }

  if (layout === 'MEDIUM') {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-canvas">
              <ProductImage product={p} t={t} className="h-full w-full object-cover" iconClassName="h-10 w-10" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div>
                <p className="text-sm font-semibold leading-snug text-ink">{p.name}</p>
                <p className="text-xs text-muted">{p.variant}</p>
                <p className="mt-1 text-base font-semibold text-primary">{formatMoney(p.priceCents)}</p>
              </div>
              <div className="mt-auto">
                <AddOrQty product={p} cart={cart} t={t} onAdd={onAdd} onSetQty={onSetQty} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {products.map((p) => (
        <li
          key={p.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-[5/4] w-full overflow-hidden bg-canvas">
            <ProductImage product={p} t={t} className="h-full w-full object-cover" iconClassName="h-14 w-14" />
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <p className="text-base font-semibold leading-snug text-ink">{p.name}</p>
              <p className="mt-0.5 text-sm text-muted">{p.variant}</p>
              <p className="mt-2 text-lg font-semibold text-primary">{formatMoney(p.priceCents)}</p>
            </div>
            <div className="mt-auto flex w-full items-center justify-center gap-3 pt-1">
              <AddOrQty
                product={p}
                cart={cart}
                t={t}
                onAdd={onAdd}
                onSetQty={onSetQty}
                buttonClassName="w-full !py-2.5 text-sm font-medium"
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
