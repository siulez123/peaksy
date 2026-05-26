import { formatVatRatePercent } from './vatDisplay';

/** Texto curto de IVA para a loja: «IVA 23%» ou «IVA reduzido 6%». */
export function vatShortLabel(
  ratePercent: number,
  label: string | undefined,
  localeTag: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const rate = formatVatRatePercent(ratePercent, localeTag);
  if (label && /reduzid/i.test(label)) {
    return t('shop.vatReduced', { rate });
  }
  return t('shop.vatShort', { rate });
}
