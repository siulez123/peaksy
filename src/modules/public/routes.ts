import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { ValidationError, NotFoundError, ConflictError } from '../../lib/errors';
import {
  formatDateForDB,
  getTodayInTimezone,
  isDateTodayOrAfter,
} from '../../lib/dates';
import { isValidInternationalPhone } from '../../lib/phone';
import { notifyOrderInStore, notifyOrderPaid } from '../../lib/orderNotifications';
import { isTimeWithinWindow, isValidHhHalfHour } from '../../lib/timeOfDay';
import { publicAnalyticsRoutes } from './analyticsRoutes';

/** Só instanciar com chave real — `new Stripe('')` rebenta ao carregar o módulo (ex.: Railway sem Stripe). */
let stripeSingleton: Stripe | null = null;
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new ValidationError('Pagamentos Stripe não estão configurados (STRIPE_SECRET_KEY).');
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return stripeSingleton;
}

function validateStripeReturnPath(
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

const checkoutSchema = z.object({
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
  /** Caminhos relativos no FRONTEND_URL (loja na raiz do subdomínio ou /loja/:slug). */
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
  paymentMethod: z.enum(['ONLINE', 'IN_STORE']).default('ONLINE'),
});

export async function publicRoutes(fastify: FastifyInstance) {
  // Helper function for hooks
  const requireTenant = async (request: any, reply: any) => {
    // Tenant should already be resolved by tenantResolver plugin's onRequest hook
    if (!request.tenant) {
      throw new NotFoundError('Tenant not found. Use X-Tenant-Slug header or correct Host header.');
    }
  };

  // GET /public/loja — nome público da loja (resolve por X-Tenant-Slug)
  fastify.get(
    '/public/loja',
    {
      schema: {
        description: 'Dados públicos da loja (nome)',
        tags: ['public'],
        response: {
          200: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              slug: { type: 'string' },
              addressLine: { type: 'string' },
              postalCode: { type: 'string' },
              locality: { type: 'string' },
              phone: { type: 'string' },
              allowOnlinePayment: { type: 'boolean' },
              allowInStorePayment: { type: 'boolean' },
            },
          },
        },
      },
      onRequest: [requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const loja = await fastify.prisma.loja.findUnique({
        where: { id: tenant.lojaId },
        select: {
          name: true,
          slug: true,
          addressLine: true,
          postalCode: true,
          locality: true,
          phone: true,
          allowOnlinePayment: true,
          allowInStorePayment: true,
        },
      });
      if (!loja) {
        throw new NotFoundError('Loja not found');
      }
      return loja;
    }
  );

  // GET /public/available-days
  fastify.get(
    '/public/available-days',
    {
      schema: {
        description: 'Get available pickup days',
        tags: ['public'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                pickupDate: { type: 'string', format: 'date' },
                orderDeadline: { type: 'string', format: 'date-time' },
                ordersOpenAt: { type: 'string', format: 'date-time', nullable: true },
                pickupTimeMin: { type: 'string' },
                pickupTimeMax: { type: 'string' },
                canOrder: { type: 'boolean' },
                dayCapTotal: { type: 'number', nullable: true },
              },
            },
          },
        },
      },
      onRequest: [requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const todayStr = formatDateForDB(getTodayInTimezone(tenant.timezone));
      const now = new Date();

      const rows = await fastify.prisma.availableDay.findMany({
        where: {
          lojaId: tenant.lojaId,
          active: true,
        },
        orderBy: {
          pickupDate: 'asc',
        },
        include: {
          pickupDateRules: { orderBy: { pickupDate: 'asc' } },
        },
      });

      const expanded: Array<{
        id: string;
        pickupDate: string;
        orderDeadline: string;
        ordersOpenAt: string | null;
        pickupTimeMin: string;
        pickupTimeMax: string;
        canOrder: boolean;
        dayCapTotal: number | null;
      }> = [];

      for (const row of rows) {
        for (const rule of row.pickupDateRules) {
          const pickupDate = formatDateForDB(rule.pickupDate);
          if (pickupDate < todayStr) continue;
          const openOk = !row.ordersOpenAt || new Date(row.ordersOpenAt) <= now;
          const canOrder = openOk && new Date(rule.orderDeadline) > now;
          expanded.push({
            id: row.id,
            pickupDate,
            orderDeadline: rule.orderDeadline.toISOString(),
            ordersOpenAt: row.ordersOpenAt ? row.ordersOpenAt.toISOString() : null,
            pickupTimeMin: row.pickupTimeMin,
            pickupTimeMax: row.pickupTimeMax,
            canOrder,
            dayCapTotal: row.dayCapTotal,
          });
        }
      }

      return expanded.sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
    }
  );

  // GET /public/products
  fastify.get(
    '/public/products',
    {
      schema: {
        description: 'Get products for a pickup date',
        tags: ['public'],
        querystring: {
          type: 'object',
          properties: {
            pickupDate: { type: 'string', format: 'date' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                variant: { type: 'string' },
                priceCents: { type: 'number' },
                imageUrl: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
      onRequest: [requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const { pickupDate } = request.query as { pickupDate?: string };

      const where: any = {
        lojaId: tenant.lojaId,
        active: true,
      };

      // If pickupDate provided, verify the day is active
      if (pickupDate) {
        const windows = await fastify.prisma.availableDay.findMany({
          where: {
            lojaId: tenant.lojaId,
            active: true,
          },
          include: { pickupDateRules: true },
        });
        const match = windows.find((w) =>
          w.pickupDateRules.some((r) => formatDateForDB(r.pickupDate) === pickupDate)
        );

        if (!match) {
          return [];
        }
      }

      const products = await fastify.prisma.product.findMany({
        where,
        orderBy: [
          { name: 'asc' },
          { variant: 'asc' },
        ],
      });

      return products.map((p) => ({
        id: p.id,
        name: p.name,
        variant: p.variant,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
      }));
    }
  );

  // POST /public/checkout
  fastify.post(
    '/public/checkout',
    {
      schema: {
        description: 'Create checkout session for an order',
        tags: ['public'],
        body: {
          type: 'object',
          required: ['pickupDate', 'pickupTime', 'items', 'customerName', 'customerPhone'],
          properties: {
            pickupDate: { type: 'string', format: 'date' },
            pickupTime: { type: 'string', description: 'HH:00 ou HH:30' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  qty: { type: 'number' },
                },
              },
            },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            customerEmail: { type: 'string', format: 'email' },
            notes: { type: 'string', maxLength: 40 },
            successPath: { type: 'string', description: 'Caminho relativo pós-pagamento (ex. /sucesso ou /loja/slug/sucesso)' },
            cancelPath: { type: 'string', description: 'Caminho relativo ao cancelar Stripe' },
            paymentMethod: { type: 'string', enum: ['ONLINE', 'IN_STORE'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              paymentMethod: { type: 'string' },
              checkoutUrl: { type: 'string' },
              successUrl: { type: 'string' },
            },
          },
        },
      },
      onRequest: [requireTenant],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: 60 * 1000, // 1 minute in milliseconds
        },
      },
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const data = checkoutSchema.parse(request.body);

      const lojaPayments = await fastify.prisma.loja.findUnique({
        where: { id: tenant.lojaId },
        select: { allowOnlinePayment: true, allowInStorePayment: true },
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
      if (data.paymentMethod === 'IN_STORE' && !lojaPayments.allowInStorePayment) {
        throw new ValidationError('Pagamento na loja não está disponível nesta loja.');
      }

      // Dia de levantamento: hoje ou futuro (no calendário da loja), não apenas "depois de hoje"
      if (!isDateTodayOrAfter(data.pickupDate, tenant.timezone)) {
        throw new ValidationError('A data de levantamento não pode ser anterior a hoje.');
      }

      const windows = await fastify.prisma.availableDay.findMany({
        where: {
          lojaId: tenant.lojaId,
          active: true,
        },
        include: {
          pickupDateRules: true,
          productCaps: true,
        },
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
      if (
        !isTimeWithinWindow(pt, availableDay.pickupTimeMin, availableDay.pickupTimeMax)
      ) {
        throw new ValidationError(
          `Hora de levantamento tem de estar entre ${availableDay.pickupTimeMin} e ${availableDay.pickupTimeMax}.`
        );
      }

      // Validate products and calculate total
      const productIds = data.items.map((item) => item.productId);
      const products = await fastify.prisma.product.findMany({
        where: {
          id: { in: productIds },
          lojaId: tenant.lojaId,
          active: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new NotFoundError('One or more products not found');
      }

      let totalCents = 0;
      const orderItems: Array<{
        productId: string;
        productNameSnapshot: string;
        variantSnapshot: string;
        unitPriceCentsSnapshot: number;
        quantity: number;
      }> = [];

      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new NotFoundError(`Product ${item.productId} not found`);
        }

        // Check product cap if exists
        const productCap = availableDay.productCaps.find(
          (cap) => cap.productId === product.id
        );
        if (productCap) {
          const paidOrdersForProduct = await fastify.prisma.orderItem.aggregate({
            where: {
              productId: product.id,
              order: {
                availableDayId: availableDay.id,
                paid: true,
                pickupDate: new Date(`${data.pickupDate}T12:00:00.000Z`),
              },
            },
            _sum: {
              quantity: true,
            },
          });

          const currentQuantity =
            (paidOrdersForProduct._sum.quantity || 0) + item.qty;
          if (currentQuantity > productCap.cap) {
            throw new ConflictError(
              `Product ${product.name} ${product.variant} cap exceeded`
            );
          }
        }

        const itemTotal = product.priceCents * item.qty;
        totalCents += itemTotal;

        orderItems.push({
          productId: product.id,
          productNameSnapshot: product.name,
          variantSnapshot: product.variant,
          unitPriceCentsSnapshot: product.priceCents,
          quantity: item.qty,
        });
      }

      if (availableDay.dayCapTotal) {
        const paidOrderCount = await fastify.prisma.order.count({
          where: {
            availableDayId: availableDay.id,
            paid: true,
          },
        });
        if (paidOrderCount >= availableDay.dayCapTotal) {
          throw new ConflictError('Limite de encomendas para este período atingido.');
        }
      }

      const frontendBase =
        process.env.FRONTEND_URL ||
        (request.headers.origin as string | undefined) ||
        'http://localhost:5173';

      const baseUrl = frontendBase.replace(/\/$/, '');
      const successRel = data.successPath
        ? validateStripeReturnPath(data.successPath, tenant.slug, 'success')
        : `/loja/${tenant.slug}`;
      const cancelRel = data.cancelPath
        ? validateStripeReturnPath(data.cancelPath, tenant.slug, 'cancel')
        : `/loja/${tenant.slug}/cancelar`;

      if (data.paymentMethod === 'IN_STORE') {
        const order = await fastify.prisma.order.create({
          data: {
            lojaId: tenant.lojaId,
            availableDayId: availableDay.id,
            pickupDate: new Date(data.pickupDate),
            pickupTime: pt,
            customerName: data.customerName.trim(),
            customerPhone: data.customerPhone.trim(),
            customerEmail: data.customerEmail?.trim() || null,
            notes: data.notes?.trim().substring(0, 40) || null,
            totalCents,
            paid: true,
            paymentMethod: 'IN_STORE',
            status: 'RECEIVED',
            items: {
              create: orderItems,
            },
          },
        });

        await notifyOrderInStore(order.id, fastify.prisma, request.log).catch((e) => {
          request.log.error({ err: e }, 'notifyOrderInStore failed');
        });

        return {
          paymentMethod: 'IN_STORE',
          successUrl: `${baseUrl}${successRel}?order_id=${order.id}`,
        };
      }

      // Create order (unpaid until Stripe)
      const order = await fastify.prisma.order.create({
        data: {
          lojaId: tenant.lojaId,
          availableDayId: availableDay.id,
          pickupDate: new Date(data.pickupDate),
          pickupTime: pt,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone.trim(),
          customerEmail: data.customerEmail?.trim() || null,
          notes: data.notes?.trim().substring(0, 40) || null,
          totalCents,
          paid: false,
          paymentMethod: 'ONLINE',
          status: 'RECEIVED',
          items: {
            create: orderItems,
          },
        },
      });

      let session: Stripe.Checkout.Session;
      try {
        session = await getStripe().checkout.sessions.create({
          payment_method_types: ['card', 'mb_way'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
          line_items: orderItems.map((item) => ({
            price_data: {
              currency: 'eur',
              product_data: {
                name: `${item.productNameSnapshot} ${item.variantSnapshot}`,
              },
              unit_amount: item.unitPriceCentsSnapshot,
            },
            quantity: item.quantity,
          })),
          mode: 'payment',
          success_url: `${baseUrl}${successRel}?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
          cancel_url: `${baseUrl}${cancelRel}`,
          metadata: {
            orderId: order.id,
            lojaId: tenant.lojaId,
          },
        });
      } catch (stripeErr: unknown) {
        request.log.error({ err: stripeErr }, 'Stripe checkout.sessions.create failed');
        throw new ValidationError('Não foi possível iniciar o pagamento. Tenta novamente.');
      }

      await fastify.prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });

      return {
        paymentMethod: 'ONLINE',
        checkoutUrl: session.url,
      };
    }
  );

  // POST /public/webhooks/stripe
  fastify.post(
    '/public/webhooks/stripe',
    {
      schema: {
        description: 'Stripe webhook handler',
        tags: ['public'],
      },
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

      if (!process.env.STRIPE_SECRET_KEY?.trim()) {
        request.log.warn('Stripe webhook chamado mas STRIPE_SECRET_KEY não está definida');
        return reply.status(503).send({ error: 'Stripe não configurado' });
      }
      if (!webhookSecret) {
        request.log.warn('STRIPE_WEBHOOK_SECRET em falta');
        return reply.status(503).send({ error: 'Webhook Stripe não configurado' });
      }

      let event: Stripe.Event;

      try {
        // Fastify raw body handling
        const body = (request as any).rawBody || request.body || '';
        const bodyString = typeof body === 'string' ? body : body.toString();
        event = getStripe().webhooks.constructEvent(bodyString, sig, webhookSecret);
      } catch (err: any) {
        request.log.warn({ err }, 'Stripe webhook signature verification failed');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          const existing = await fastify.prisma.order.findUnique({ where: { id: orderId } });
          if (!existing) {
            request.log.warn({ orderId }, 'Webhook: encomenda não encontrada');
          } else if (existing.paid) {
            request.log.info({ orderId }, 'Webhook: encomenda já paga, ignorando duplicado');
          } else {
            await fastify.prisma.order.update({
              where: { id: orderId },
              data: {
                paid: true,
                stripeSessionId: session.id,
              },
            });
            request.log.info({ orderId }, 'Order marked as paid');
            await notifyOrderPaid(orderId, fastify.prisma, request.log).catch((e) => {
              request.log.error({ err: e }, 'notifyOrderPaid failed');
            });
          }
        }
      }

      return { received: true };
    }
  );

  // GET /public/order-confirmation — resumo da encomenda na página de sucesso
  fastify.get(
    '/public/order-confirmation',
    {
      schema: {
        description: 'Detalhes públicos da encomenda (página de sucesso)',
        tags: ['public'],
        querystring: {
          type: 'object',
          properties: {
            order_id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string' },
          },
        },
      },
      onRequest: [requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const q = request.query as { order_id?: string; session_id?: string };
      const orderId = q.order_id?.trim();
      const sessionId = q.session_id?.trim();

      if (!orderId && !sessionId) {
        throw new ValidationError('Indica order_id ou session_id.');
      }

      const order = await fastify.prisma.order.findFirst({
        where: {
          lojaId: tenant.lojaId,
          ...(orderId && sessionId
            ? {
                OR: [{ id: orderId }, { stripeSessionId: sessionId }],
              }
            : orderId
              ? { id: orderId }
              : { stripeSessionId: sessionId! }),
        },
        include: {
          items: { orderBy: { productNameSnapshot: 'asc' } },
          loja: { select: { name: true } },
        },
      });

      if (!order) {
        throw new NotFoundError('Encomenda não encontrada');
      }

      return {
        orderRef: order.id.slice(0, 8).toUpperCase(),
        lojaName: order.loja.name,
        customerName: order.customerName,
        pickupDate: formatDateForDB(order.pickupDate),
        pickupTime: order.pickupTime,
        totalCents: order.totalCents,
        paymentMethod: order.paymentMethod,
        paid: order.paid,
        notes: order.notes,
        items: order.items.map((it) => ({
          productName: it.productNameSnapshot,
          variant: it.variantSnapshot,
          quantity: it.quantity,
          lineCents: it.unitPriceCentsSnapshot * it.quantity,
        })),
      };
    }
  );

  await fastify.register(publicAnalyticsRoutes);
}

