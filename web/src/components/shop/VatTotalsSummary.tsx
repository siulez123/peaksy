import { formatMoney } from '../../api';
import { useI18n } from '../../i18n/context';

type Props = {
  totalGrossCents: number;
  className?: string;
};

/** Total da encomenda + nota «preços com IVA incluído» (sem linha «Total IVA»). */
export function VatTotalsSummary({ totalGrossCents, className }: Props) {
  const { t } = useI18n();

  return (
    <div className={className ?? 'space-y-1'}>
      <div className="flex justify-between gap-2 text-sm font-semibold text-ink tabular-nums">
        <span>{t('common.total')}</span>
        <span>{formatMoney(totalGrossCents)}</span>
      </div>
      <p className="text-[11px] leading-snug text-muted">{t('shop.pricesIncludeVat')}</p>
    </div>
  );
}
