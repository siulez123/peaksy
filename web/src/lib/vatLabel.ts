import { formatVatRatePercent } from './vatDisplay';

/** Texto curto de IVA: «IVA 23%», «IVA 6%», etc. (independente do nome interno do escalão). */
export function vatShortLabel(
  ratePercent: number,
  _label: string | undefined,
  localeTag: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const rate = formatVatRatePercent(ratePercent, localeTag);
  return t('shop.vatShort', { rate });
}
