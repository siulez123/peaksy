import { formatMoney } from '../api';
import {
  vatCentsFromGrossCents,
  summarizeVatByRate,
  type VatLineInput,
  type VatSummaryRow,
} from './vatMath';

export { vatCentsFromGrossCents, summarizeVatByRate, type VatLineInput, type VatSummaryRow };

export function formatVatRatePercent(rate: number, localeTag: string): string {
  const n = Number(rate);
  if (!Number.isFinite(n)) return String(rate);
  return new Intl.NumberFormat(localeTag, { maximumFractionDigits: 2 }).format(n);
}

export function linesToVatInput(
  lines: Array<{ priceCents: number; qty: number; vatRatePercent: number; vatRateLabel?: string }>
): VatLineInput[] {
  return lines.map((l) => ({
    grossCents: l.priceCents * l.qty,
    ratePercent: l.vatRatePercent,
    label: l.vatRateLabel,
  }));
}

export function totalVatCentsFromLines(
  lines: Array<{ priceCents: number; qty: number; vatRatePercent: number }>
): number {
  return lines.reduce(
    (s, l) => s + vatCentsFromGrossCents(l.priceCents * l.qty, l.vatRatePercent),
    0
  );
}

export type VatDisplayLabels = {
  included: (rate: string) => string;
  lineDetail: (vat: string, rate: string) => string;
  totalVat: string;
  breakdownRow: (label: string, rate: string, vat: string) => string;
};

export function buildVatSummaryRows(
  lines: Array<{ priceCents: number; qty: number; vatRatePercent: number; vatRateLabel?: string }>,
  localeTag: string,
  labels: VatDisplayLabels
): { rows: VatSummaryRow[]; totalVatCents: number; formatRow: (row: VatSummaryRow) => string } {
  const rows = summarizeVatByRate(linesToVatInput(lines));
  const totalVatCents = rows.reduce((s, r) => s + r.vatCents, 0);
  return {
    rows,
    totalVatCents,
    formatRow: (row) =>
      labels.breakdownRow(
        row.label,
        formatVatRatePercent(row.ratePercent, localeTag),
        formatMoney(row.vatCents)
      ),
  };
}

export type VatLine = {
  priceCents: number;
  qty: number;
  vatRatePercent: number;
  vatRateLabel?: string;
};
