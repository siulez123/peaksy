import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify/types/logger';
import { z } from 'zod';
import {
  checkoutSchema,
  frontendBaseUrl,
  validateCheckoutRequest,
} from './checkoutValidation';
import { createInStoreOrder } from './createInStoreOrder';
import { OTP_MAX_ATTEMPTS, verifyOtpCode } from './checkoutOtp';
import { UnauthorizedError, ValidationError } from './errors';
import { notifyOrderInStore } from './orderNotifications';

const inStoreSchema = checkoutSchema.extend({
  paymentMethod: z.literal('IN_STORE'),
});

function validatedFromStored(
  tenant: { lojaId: string; slug: string; timezone: string },
  raw: Record<string, unknown>
) {
  const data = inStoreSchema.parse({
    pickupDate: raw.pickupDate,
    pickupTime: raw.pickupTime,
    items: raw.items,
    customerName: raw.customerName,
    customerPhone: raw.customerPhone,
    customerEmail: raw.customerEmail,
    notes: raw.notes,
    successPath: raw.successPath,
    cancelPath: raw.cancelPath,
    paymentMethod: 'IN_STORE',
  });

  return { data, successRel: String(raw.successRel) };
}

export async function completeInStoreVerification(
  prisma: PrismaClient,
  tenant: { lojaId: string; slug: string; timezone: string },
  row: {
    id: string;
    payload: unknown;
    codeHash: string;
    attempts: number;
  },
  code: string,
  log: FastifyBaseLogger,
  origin?: string
): Promise<{ paymentMethod: 'IN_STORE'; successUrl: string }> {
  if (!verifyOtpCode(code, row.codeHash)) {
    await prisma.checkoutVerification.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    const left = OTP_MAX_ATTEMPTS - row.attempts - 1;
    if (left <= 0) {
      throw new ValidationError('Código incorreto. Pede um novo código.');
    }
    throw new UnauthorizedError(`Código incorreto. Restam ${left} tentativa(s).`);
  }

  const partial = validatedFromStored(tenant, row.payload as Record<string, unknown>);
  const validated = await validateCheckoutRequest(prisma, tenant, partial.data);

  const order = await createInStoreOrder(prisma, tenant.lojaId, validated);

  await prisma.checkoutVerification.update({
    where: { id: row.id },
    data: { verifiedAt: new Date(), consumedAt: new Date() },
  });

  await notifyOrderInStore(order.id, prisma, log).catch((e) => {
    log.error({ err: e }, 'notifyOrderInStore failed');
  });

  const baseUrl = frontendBaseUrl(origin);
  return {
    paymentMethod: 'IN_STORE',
    successUrl: `${baseUrl}${validated.successRel}?order_id=${order.id}`,
  };
}
