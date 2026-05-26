import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  checkoutSchema,
  validateCheckoutRequest,
  type ValidatedCheckout,
} from '../../lib/checkoutValidation';
import {
  generateOtpCode,
  hashOtpCode,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_MIN_MS,
  OTP_TTL_MS,
} from '../../lib/checkoutOtp';
import type { FastifyBaseLogger } from 'fastify/types/logger';
import { completeInStoreVerification } from '../../lib/completeInStoreVerification';
import { NotFoundError, ValidationError, TooManyRequestsError } from '../../lib/errors';
import {
  lojaHasSms,
  lojaHasSmtp,
  lojaNotificationSelect,
  lojaSmsCredentials,
  lojaSmtpCredentials,
} from '../../lib/lojaNotificationConfig';
import { sendCheckoutOtpEmail } from '../../lib/sendCheckoutOtpEmail';
import { sendSms } from '../../lib/sms';

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function assertInStoreVerifySms(fastify: FastifyInstance, lojaId: string) {
  const loja = await fastify.prisma.loja.findUnique({
    where: { id: lojaId },
    select: { name: true, inStoreVerifySms: true, ...lojaNotificationSelect },
  });
  if (!loja?.inStoreVerifySms) {
    throw new ValidationError('Confirmação por SMS não está ativa nesta loja.');
  }
  if (!lojaHasSms(loja)) {
    throw new ValidationError('SMS não configurado (Twilio).');
  }
  return loja;
}

async function assertInStoreVerifyEmail(fastify: FastifyInstance, lojaId: string) {
  const loja = await fastify.prisma.loja.findUnique({
    where: { id: lojaId },
    select: { inStoreVerifyEmail: true, name: true, ...lojaNotificationSelect },
  });
  if (!loja?.inStoreVerifyEmail) {
    throw new ValidationError('Confirmação por email não está ativa nesta loja.');
  }
  if (!lojaHasSmtp(loja)) {
    throw new ValidationError('Email não configurado (SMTP).');
  }
  return loja;
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
      const loja = await assertInStoreVerifySms(fastify, tenant.lojaId);

      const now = new Date();
      const recent = await fastify.prisma.checkoutVerification.findFirst({
        where: {
          lojaId: tenant.lojaId,
          channel: 'SMS',
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
          channel: 'SMS',
          phoneE164: validated.phoneE164,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });

      const code = generateOtpCode();
      const smsBody = `${loja.name}: o teu código de confirmação é ${code}. Válido 10 minutos.`;
      const smsCreds = lojaSmsCredentials(loja)!;
      try {
        await sendSms(validated.phoneE164, smsBody, request.log, {
          required: true,
          credentials: smsCreds,
        });
      } catch (e) {
        throw new ValidationError(
          e instanceof Error ? e.message : 'Não foi possível enviar o SMS.'
        );
      }

      const verification = await fastify.prisma.checkoutVerification.create({
        data: {
          lojaId: tenant.lojaId,
          channel: 'SMS',
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
    '/public/checkout/email/send-code',
    {
      schema: {
        description: 'Enviar código por email para confirmar encomenda (pagamento na loja)',
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
      const email = validated.data.customerEmail?.trim();
      if (!email) {
        throw new ValidationError('Indica um email para receber o código de confirmação.');
      }
      const emailNorm = normalizeEmail(email);
      const loja = await assertInStoreVerifyEmail(fastify, tenant.lojaId);
      const smtp = lojaSmtpCredentials(loja);
      if (!smtp) {
        throw new ValidationError('Email não configurado (SMTP).');
      }

      const now = new Date();
      const recent = await fastify.prisma.checkoutVerification.findFirst({
        where: {
          lojaId: tenant.lojaId,
          channel: 'EMAIL',
          email: emailNorm,
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
          channel: 'EMAIL',
          email: emailNorm,
          consumedAt: null,
        },
        data: { consumedAt: now },
      });

      const code = generateOtpCode();
      await sendCheckoutOtpEmail(smtp, emailNorm, loja.name, code, request.log);

      const verification = await fastify.prisma.checkoutVerification.create({
        data: {
          lojaId: tenant.lojaId,
          channel: 'EMAIL',
          email: emailNorm,
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

  async function verifyCode(
    tenant: { lojaId: string; slug: string; timezone: string },
    body: unknown,
    log: FastifyBaseLogger,
    origin?: string
  ) {
    const { verificationId, code } = verifySchema.parse(body);

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

    return completeInStoreVerification(fastify.prisma, tenant, row, code, log, origin);
  }

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
    async (request) =>
      verifyCode(
        request.tenant!,
        request.body,
        request.log,
        request.headers.origin as string | undefined
      )
  );

  fastify.post(
    '/public/checkout/email/verify',
    {
      schema: {
        description: 'Validar código email e criar encomenda (pagamento na loja)',
        tags: ['public'],
      },
      onRequest: [requireTenant],
      config: {
        rateLimit: { max: 20, timeWindow: 60 * 1000 },
      },
    },
    async (request) =>
      verifyCode(
        request.tenant!,
        request.body,
        request.log,
        request.headers.origin as string | undefined
      )
  );
}
