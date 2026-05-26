import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  checkoutSchema,
  frontendBaseUrl,
  validateCheckoutRequest,
  type ValidatedCheckout,
} from '../../lib/checkoutValidation';
import { createInStoreOrder } from '../../lib/createInStoreOrder';
import {
  generateOtpCode,
  hashOtpCode,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_MIN_MS,
  OTP_TTL_MS,
  verifyOtpCode,
} from '../../lib/checkoutOtp';
import { NotFoundError, UnauthorizedError, ValidationError, TooManyRequestsError } from '../../lib/errors';
import { notifyOrderInStore } from '../../lib/orderNotifications';
import { isSmsConfigured, sendSms } from '../../lib/sms';

const inStoreCheckoutSchema = checkoutSchema.extend({
  paymentMethod: z.literal('IN_STORE'),
});

const verifySchema = z.object({
  verificationId: z.string().uuid(),
  code: z.string().min(4).max(8),
});

function storedPayload(validated: ValidatedCheckout) {
  return {
    pickupDate: validated.data.pickupDate,
    pickupTime: validated.data.pickupTime,
    items: validated.data.items,
    customerName: validated.data.customerName,
    customerPhone: validated.data.customerPhone,
    customerEmail: validated.data.customerEmail,
    notes: validated.data.notes,
    successPath: validated.data.successPath,
    cancelPath: validated.data.cancelPath,
    paymentMethod: 'IN_STORE' as const,
    phoneE164: validated.phoneE164,
    availableDayId: validated.availableDayId,
    successRel: validated.successRel,
    cancelRel: validated.cancelRel,
  };
}

function validatedFromStored(
  tenant: { lojaId: string; slug: string; timezone: string },
  raw: Record<string, unknown>
): ValidatedCheckout {
  const data = inStoreCheckoutSchema.parse({
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

  return {
    data,
    phoneE164: String(raw.phoneE164),
    availableDayId: String(raw.availableDayId),
    pickupTime: data.pickupTime.trim(),
    orderItems: [],
    totalCents: 0,
    successRel: String(raw.successRel),
    cancelRel: String(raw.cancelRel),
  };
}

export async function phoneCheckoutRoutes(fastify: FastifyInstance) {
  const requireTenant = async (request: { tenant?: { lojaId: string; slug: string; timezone: string } }) => {
    if (!request.tenant) {
      throw new NotFoundError('Tenant not found. Use X-Tenant-Slug header or correct Host header.');
    }
  };

  fastify.post(
    '/public/checkout/phone/send-code',
    {
      schema: {
        description: 'Enviar código SMS para confirmar encomenda (pagamento na loja)',
        tags: ['public'],
      },
      onRequest: [requireTenant],
      config: {
        rateLimit: { max: 8, timeWindow: 60 * 1000 },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const body = inStoreCheckoutSchema.parse(request.body);
      const validated = await validateCheckoutRequest(fastify.prisma, tenant, body);

      const now = new Date();
      const recent = await fastify.prisma.checkoutVerification.findFirst({
        where: {
          lojaId: tenant.lojaId,
          phoneE164: validated.phoneE164,
          consumedAt: null,
          lastSentAt: { gt: new Date(now.getTime() - OTP_RESEND_MIN_MS) },
        },
        orderBy: { lastSentAt: 'desc' },
      });

      if (recent) {
        const waitSec = Math.ceil(
          (recent.lastSentAt.getTime() + OTP_RESEND_MIN_MS - now.getTime()) / 1000
        );
        throw new TooManyRequestsError(
          `Aguarda ${Math.max(1, waitSec)} segundos antes de pedir um novo código.`
        );
      }

      await fastify.prisma.checkoutVerification.updateMany({
        where: {
          lojaId: tenant.lojaId,
          phoneE164: validated.phoneE164,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });

      const code = generateOtpCode();
      const loja = await fastify.prisma.loja.findUnique({
        where: { id: tenant.lojaId },
        select: { name: true },
      });

      const smsBody = `${loja?.name ?? 'Loja'}: o teu código de confirmação é ${code}. Válido 10 minutos.`;
      if (!isSmsConfigured() && process.env.NODE_ENV === 'development') {
        request.log.info({ code, phone: validated.phoneE164 }, 'OTP SMS (dev, Twilio não configurado)');
      } else {
        try {
          await sendSms(validated.phoneE164, smsBody, request.log, { required: true });
        } catch (e) {
          throw new ValidationError(
            e instanceof Error ? e.message : 'Não foi possível enviar o SMS.'
          );
        }
      }

      const verification = await fastify.prisma.checkoutVerification.create({
        data: {
          lojaId: tenant.lojaId,
          phoneE164: validated.phoneE164,
          codeHash: hashOtpCode(code),
          expiresAt: new Date(now.getTime() + OTP_TTL_MS),
          lastSentAt: now,
          payload: storedPayload(validated),
        },
      });

      return {
        verificationId: verification.id,
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
        resendAfterSeconds: Math.floor(OTP_RESEND_MIN_MS / 1000),
      };
    }
  );

  fastify.post(
    '/public/checkout/phone/verify',
    {
      schema: {
        description: 'Validar código SMS e criar encomenda (pagamento na loja)',
        tags: ['public'],
      },
      onRequest: [requireTenant],
      config: {
        rateLimit: { max: 20, timeWindow: 60 * 1000 },
      },
    },
    async (request) => {
      const tenant = request.tenant!;
      const { verificationId, code } = verifySchema.parse(request.body);

      const row = await fastify.prisma.checkoutVerification.findFirst({
        where: { id: verificationId, lojaId: tenant.lojaId },
      });

      if (!row || row.consumedAt) {
        throw new NotFoundError('Pedido de verificação inválido ou expirado.');
      }

      if (row.expiresAt < new Date()) {
        throw new ValidationError('O código expirou. Pede um novo código.');
      }

      if (row.attempts >= OTP_MAX_ATTEMPTS) {
        throw new ValidationError('Demasiadas tentativas. Pede um novo código.');
      }

      if (!verifyOtpCode(code, row.codeHash)) {
        await fastify.prisma.checkoutVerification.update({
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
      const validated = await validateCheckoutRequest(fastify.prisma, tenant, partial.data);

      const order = await createInStoreOrder(fastify.prisma, tenant.lojaId, validated);

      await fastify.prisma.checkoutVerification.update({
        where: { id: row.id },
        data: { verifiedAt: new Date(), consumedAt: new Date() },
      });

      await notifyOrderInStore(order.id, fastify.prisma, request.log).catch((e) => {
        request.log.error({ err: e }, 'notifyOrderInStore failed');
      });

      const baseUrl = frontendBaseUrl(request.headers.origin as string | undefined);
      return {
        paymentMethod: 'IN_STORE' as const,
        successUrl: `${baseUrl}${validated.successRel}?order_id=${order.id}`,
      };
    }
  );
}
