import { formatMoney } from '../../api';
import { useI18n } from '../../i18n/context';
import { vatShortLabel } from '../../lib/vatLabel';

type VatHintProps = {
  ratePercent: number;
  label?: string;
  className?: string;
};

/** Linha secundária: «IVA 23%» (preço TTC no elemento pai). */
export function VatHint({ ratePercent, label, className }: VatHintProps) {
  const { t, localeTag } = useI18n();
  return (
    <p className={className ?? 'text-xs leading-snug text-muted'}>
      {vatShortLabel(ratePercent, label, localeTag, t)}
    </p>
  );
}

type PriceWithVatProps = {
  grossCents: number;
  ratePercent: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const priceClass: Record<NonNullable<PriceWithVatProps['size']>, string> = {
  sm: 'text-base font-semibold text-primary',
  md: 'text-lg font-semibold text-primary',
  lg: 'text-lg font-semibold text-primary',
};

/** Preço TTC + «IVA X%». */
export function PriceWithVat({ grossCents, ratePercent, label, size = 'md', className }: PriceWithVatProps) {
  return (
    <div className={className}>
      <p className={`tabular-nums ${priceClass[size]}`}>{formatMoney(grossCents)}</p>
      <VatHint ratePercent={ratePercent} label={label} />
    </div>
  );
}
