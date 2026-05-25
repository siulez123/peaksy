import { formatMoney } from '../../api';
import { useI18n } from '../../i18n/context';
import { formatVatRatePercent, vatCentsFromGrossCents } from '../../lib/vatDisplay';
type VatHintProps = {
  grossCents: number;
  ratePercent: number;
  label?: string;
  /** Mostrar montante de IVA além da taxa */
  showAmount?: boolean;
  className?: string;
};

/** Linha secundária com taxa de IVA (preço TTC no elemento pai). */
export function VatHint({ grossCents, ratePercent, label, showAmount = false, className }: VatHintProps) {
  const { t, localeTag } = useI18n();
  const rate = formatVatRatePercent(ratePercent, localeTag);
  const vatCents = vatCentsFromGrossCents(grossCents, ratePercent);

  return (
    <p className={className ?? 'text-xs leading-snug text-muted'}>
      {showAmount && vatCents > 0 ? (
        t('shop.vatLineDetail', { vat: formatMoney(vatCents), rate })
      ) : label ? (
        t('shop.vatRateLabel', { label, rate })
      ) : (
        t('shop.vatIncluded', { rate })
      )}
    </p>
  );
}

type PriceWithVatProps = {
  grossCents: number;
  ratePercent: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showAmount?: boolean;
  className?: string;
};

const priceClass: Record<NonNullable<PriceWithVatProps['size']>, string> = {
  sm: 'text-base font-semibold text-primary',
  md: 'text-lg font-semibold text-primary',
  lg: 'text-lg font-semibold text-primary',
};

/** Preço TTC + indicação de IVA. */
export function PriceWithVat({
  grossCents,
  ratePercent,
  label,
  size = 'md',
  showAmount = false,
  className,
}: PriceWithVatProps) {
  return (
    <div className={className}>
      <p className={`tabular-nums ${priceClass[size]}`}>{formatMoney(grossCents)}</p>
      <VatHint grossCents={grossCents} ratePercent={ratePercent} label={label} showAmount={showAmount} />
    </div>
  );
}
