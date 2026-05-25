import { formatMoney } from '../../api';
import { useI18n } from '../../i18n/context';
import { buildVatSummaryRows, type VatLine } from '../../lib/vatDisplay';

type Props = {
  lines: VatLine[];
  totalGrossCents: number;
  className?: string;
};

/** Resumo de IVA por escalão + total IVA (carrinho, checkout, confirmação). */
export function VatTotalsSummary({ lines, totalGrossCents, className }: Props) {
  const { t, localeTag } = useI18n();

  if (lines.length === 0) return null;

  const { rows, totalVatCents, formatRow } = buildVatSummaryRows(lines, localeTag, {
    included: (rate) => t('shop.vatIncluded', { rate }),
    lineDetail: (vat, rate) => t('shop.vatLineDetail', { vat, rate }),
    totalVat: t('shop.totalVat'),
    breakdownRow: (label, rate, vat) => t('shop.vatBreakdown', { label, rate, vat }),
  });

  return (
    <div className={className ?? 'space-y-1.5 text-xs text-muted'}>
      {rows.length > 1 &&
        rows.map((row) => (
          <div key={row.ratePercent} className="flex justify-between gap-2 tabular-nums">
            <span>{formatRow(row)}</span>
          </div>
        ))}
      {totalVatCents > 0 && (
        <div className="flex justify-between gap-2 tabular-nums font-medium text-ink">
          <span>{t('shop.totalVat')}</span>
          <span>{formatMoney(totalVatCents)}</span>
        </div>
      )}
      <div className="flex justify-between gap-2 border-t border-border/80 pt-1.5 tabular-nums text-sm font-semibold text-ink">
        <span>{t('common.total')}</span>
        <span>{formatMoney(totalGrossCents)}</span>
      </div>
      <p className="text-[11px] leading-snug text-muted">{t('shop.pricesIncludeVat')}</p>
    </div>
  );
}
