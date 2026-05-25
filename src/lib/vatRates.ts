import type { PrismaClient } from '@prisma/client';

export const DEFAULT_PT_VAT_RATES = [
  { label: 'Reduzida', ratePercent: 6, sortOrder: 0 },
  { label: 'Intermédia', ratePercent: 13, sortOrder: 1 },
  { label: 'Normal', ratePercent: 23, sortOrder: 2 },
] as const;

type PrismaLike = Pick<PrismaClient, 'vatRate'>;

/** Escalões de IVA padrão (Portugal) para uma loja nova. */
export async function createDefaultVatRatesForLoja(
  prisma: PrismaLike,
  lojaId: string
): Promise<{ id: string; label: string; ratePercent: number; sortOrder: number }[]> {
  const rows = await Promise.all(
    DEFAULT_PT_VAT_RATES.map((r) =>
      prisma.vatRate.create({
        data: {
          lojaId,
          label: r.label,
          ratePercent: r.ratePercent,
          sortOrder: r.sortOrder,
        },
      })
    )
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    ratePercent: Number(r.ratePercent),
    sortOrder: r.sortOrder,
  }));
}

/** Escalão «Normal» (23%) ou o último da lista. */
export async function getDefaultVatRateIdForLoja(
  prisma: PrismaLike,
  lojaId: string
): Promise<string> {
  const normal = await prisma.vatRate.findFirst({
    where: { lojaId, label: 'Normal' },
    orderBy: { sortOrder: 'desc' },
    select: { id: true },
  });
  if (normal) return normal.id;
  const any = await prisma.vatRate.findFirst({
    where: { lojaId },
    orderBy: { sortOrder: 'desc' },
    select: { id: true },
  });
  if (!any) {
    const created = await createDefaultVatRatesForLoja(prisma, lojaId);
    return created[created.length - 1]!.id;
  }
  return any.id;
}
