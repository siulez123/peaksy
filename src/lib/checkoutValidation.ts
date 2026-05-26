import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { formatDateForDB, isDateTodayOrAfter } from './dates';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import { isValidInternationalPhone } from './phone';
import { normalizePhoneE164 } from './phoneE164';
import { isTimeWithinWindow, isValidHhHalfHour } from './timeOfDay';

export const checkoutSchema = z.object({
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z
    .string()
    .min(1)
    .regex(
      /^([01]\d|2[0-3]):(00|30)$/,
      'Hora de levantamento: horas cheias ou meias (ex.: 13:00, 13:30).'
    ),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
  customerName: z.string().min(1).max(200),
  customerPhone: z
    .string()
    .min(1)
    .max(50)
    .refine((s) => isValidInternationalPhone(s), {
      message: 'Telefone inválido (8–15 dígitos; + e código do país permitidos).',
    }),
  customerEmail: z.string().email().optional(),
  notes: z.string().max(40).optional(),
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
  paymentMethod: z.enum(['ONLINE', 'IN_STORE']).default('ONLINE'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type OrderItemCreate = {
  productId: string;
  productNameSnapshot: string;
  variantSnapshot: string;
  unitPriceCentsSnapshot: number;
  vatRatePercentSnapshot: number;
  vatRateLabelSnapshot: string;
  quantity: number;
};

export type ValidatedCheckout = {
  data: CheckoutInput;
  phoneE164: string;
  availableDayId: string;
  pickupTime: string;
  orderItems: OrderItemCreate[];
  totalCents: number;
  successRel: string;
  cancelRel: string;
};

export type TenantCtx = {
  lojaId: string;
  slug: string;
  timezone: string;
};

export function validateStripeReturnPath(
  path: string,
  tenantSlug: string,
  kind: 'success' | 'cancel'
): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.includes('..') || trimmed.includes('//')) {
    throw new ValidationError('Caminho de retorno inválido.');
  }
  const okSuccess =
    trimmed === '/' ||
    trimmed === `/loja/${tenantSlug}` ||
    trimmed === '/sucesso' ||
    trimmed === `/loja/${tenantSlug}/sucesso`;
  const okCancel =
    trimmed === '/cancelar' || trimmed === `/loja/${tenantSlug}/cancelar`;
  if (kind === 'success' && !okSuccess) {
    throw new ValidationError('Caminho de sucesso após pagamento não permitido.');
  }
  if (kind === 'cancel' && !okCancel) {
    throw new ValidationError('Caminho de cancelamento não permitido.');
  }
  return trimmed;
}

export async function validateCheckoutRequest(
  prisma: PrismaClient,
  tenant: TenantCtx,
  data: CheckoutInput
): Promise<ValidatedCheckout> {
  const lojaPayments = await prisma.loja.findUnique({
    where: { id: tenant.lojaId },
    select: {
      allowOnlinePayment: true,
      allowInStorePayment: true,
      smtpHost: true,
      emailFrom: true,
      twilioAccountSid: true,
      twilioAuthToken: true,
      twilioFromNumber: true,
    },
  });
  if (!lojaPayments) {
    throw new NotFoundError('Loja not found');
  }
  if (!lojaPayments.allowOnlinePayment && !lojaPayments.allowInStorePayment) {
    throw new ValidationError('Esta loja não aceita encomendas neste momento.');
  }
  if (data.paymentMethod === 'ONLINE' && !lojaPayments.allowOnlinePayment) {
    throw new ValidationError('Pagamento online não está disponível nesta loja.');
  }
  const inStoreSmsOk =
    Boolean(lojaPayments.twilioAccountSid?.trim()) &&
    Boolean(lojaPayments.twilioAuthToken?.trim()) &&
    Boolean(lojaPayments.twilioFromNumber?.trim());
  if (data.paymentMethod === 'IN_STORE') {
    if (!lojaPayments.allowInStorePayment) {
      throw new ValidationError('Pagamento na loja não está disponível nesta loja.');
    }
    if (!inStoreSmsOk) {
      throw new ValidationError('Confirmação por SMS não está configurada nesta loja.');
    }
  }

  const smtpOk = Boolean(lojaPayments.smtpHost?.trim() && lojaPayments.emailFrom?.trim());
  if (data.customerEmail?.trim() && !smtpOk) {
    throw new ValidationError('Confirmação por email não está disponível nesta loja.');
  }

  const phoneE164 = normalizePhoneE164(data.customerPhone);
  if (!phoneE164) {
    throw new ValidationError('Telefone inválido.');
  }

  if (!isDateTodayOrAfter(data.pickupDate, tenant.timezone)) {
    throw new ValidationError('A data de levantamento não pode ser anterior a hoje.');
  }

  const windows = await prisma.availableDay.findMany({
    where: { lojaId: tenant.lojaId, active: true },
    include: { pickupDateRules: true, productCaps: true },
  });

  const availableDay = windows.find((r) => {
    const s = formatDateForDB(r.pickupDate);
    const e = formatDateForDB(r.pickupEndDate);
    return data.pickupDate >= s && data.pickupDate <= e;
  });

  if (!availableDay) {
    throw new NotFoundError('Available day not found');
  }

  const pickupRule = availableDay.pickupDateRules.find(
    (rule) => formatDateForDB(rule.pickupDate) === data.pickupDate
  );
  if (!pickupRule) {
    throw new NotFoundError('Available day not found');
  }

  if (availableDay.ordersOpenAt && new Date(availableDay.ordersOpenAt) > new Date()) {
    throw new ValidationError('As encomendas para este período ainda não estão abertas.');
  }

  if (new Date(pickupRule.orderDeadline) < new Date()) {
    throw new ValidationError('Order deadline has passed');
  }

  const pt = data.pickupTime.trim();
  if (!isValidHhHalfHour(pt)) {
    throw new ValidationError('Hora de levantamento: horas cheias ou meias (ex.: 13:00, 13:30).');
  }
  if (!isTimeWithinWindow(pt, availableDay.pickupTimeMin, availableDay.pickupTimeMax)) {
    throw new ValidationError(
      `Hora de levantamento tem de estar entre ${availableDay.pickupTimeMin} e ${availableDay.pickupTimeMax}.`
    );
  }

  const productIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, lojaId: tenant.lojaId, active: true },
    include: { vatRate: true },
  });

  if (products.length !== productIds.length) {
    throw new NotFoundError('One or more products not found');
  }

  let totalCents = 0;
  const orderItems: OrderItemCreate[] = [];

  for (const item of data.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new NotFoundError(`Product ${item.productId} not found`);
    }

    const productCap = availableDay.productCaps.find((cap) => cap.productId === product.id);
    if (productCap) {
      const paidOrdersForProduct = await prisma.orderItem.aggregate({
        where: {
          productId: product.id,
          order: {
            availableDayId: availableDay.id,
            paid: true,
            pickupDate: new Date(`${data.pickupDate}T12:00:00.000Z`),
          },
        },
        _sum: { quantity: true },
      });

      const currentQuantity = (paidOrdersForProduct._sum.quantity || 0) + item.qty;
      if (currentQuantity > productCap.cap) {
        throw new ConflictError(`Product ${product.name} ${product.variant} cap exceeded`);
      }
    }

    totalCents += product.priceCents * item.qty;
    orderItems.push({
      productId: product.id,
      productNameSnapshot: product.name,
      variantSnapshot: product.variant,
      unitPriceCentsSnapshot: product.priceCents,
      vatRatePercentSnapshot: Number(product.vatRate.ratePercent),
      vatRateLabelSnapshot: product.vatRate.label,
      quantity: item.qty,
    });
  }

  if (availableDay.dayCapTotal) {
    const paidOrderCount = await prisma.order.count({
      where: { availableDayId: availableDay.id, paid: true },
    });
    if (paidOrderCount >= availableDay.dayCapTotal) {
      throw new ConflictError('Limite de encomendas para este período atingido.');
    }
  }

  const successRel = data.successPath
    ? validateStripeReturnPath(data.successPath, tenant.slug, 'success')
    : `/loja/${tenant.slug}`;
  const cancelRel = data.cancelPath
    ? validateStripeReturnPath(data.cancelPath, tenant.slug, 'cancel')
    : `/loja/${tenant.slug}/cancelar`;

  return {
    data,
    phoneE164,
    availableDayId: availableDay.id,
    pickupTime: pt,
    orderItems,
    totalCents,
    successRel,
    cancelRel,
  };
}

export function frontendBaseUrl(origin?: string): string {
  const base =
    process.env.FRONTEND_URL || origin || 'http://localhost:5173';
  return base.replace(/\/$/, '');
}
