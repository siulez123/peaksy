import type { PrismaClient } from '@prisma/client';
import type { ValidatedCheckout } from './checkoutValidation';

export async function createInStoreOrder(
  prisma: PrismaClient,
  lojaId: string,
  validated: ValidatedCheckout
) {
  const { data, availableDayId, pickupTime, orderItems, totalCents } = validated;

  return prisma.order.create({
    data: {
      lojaId,
      availableDayId,
      pickupDate: new Date(data.pickupDate),
      pickupTime,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: data.customerEmail?.trim() || null,
      notes: data.notes?.trim().substring(0, 40) || null,
      totalCents,
      paid: true,
      paymentMethod: 'IN_STORE',
      status: 'RECEIVED',
      items: { create: orderItems },
    },
  });
}
