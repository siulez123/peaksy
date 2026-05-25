/** IVA extraído de preço TTC (cêntimos). */
export function vatCentsFromGrossCents(grossCents: number, ratePercent: number): number {
  if (ratePercent <= 0) return 0;
  return Math.round((grossCents * ratePercent) / (100 + ratePercent));
}

export function netCentsFromGrossCents(grossCents: number, ratePercent: number): number {
  return grossCents - vatCentsFromGrossCents(grossCents, ratePercent);
}

export type VatLineInput = { grossCents: number; ratePercent: number; label?: string };

export type VatSummaryRow = {
  ratePercent: number;
  label: string;
  grossCents: number;
  vatCents: number;
};

export function summarizeVatByRate(lines: VatLineInput[]): VatSummaryRow[] {
  const map = new Map<number, { label: string; grossCents: number; vatCents: number }>();
  for (const line of lines) {
    const rate = line.ratePercent;
    const vat = vatCentsFromGrossCents(line.grossCents, rate);
    const prev = map.get(rate) ?? {
      label: line.label ?? `${rate}%`,
      grossCents: 0,
      vatCents: 0,
    };
    map.set(rate, {
      label: line.label ?? prev.label,
      grossCents: prev.grossCents + line.grossCents,
      vatCents: prev.vatCents + vat,
    });
  }
  return Array.from(map.entries())
    .map(([ratePercent, row]) => ({ ratePercent, ...row }))
    .sort((a, b) => a.ratePercent - b.ratePercent);
}
