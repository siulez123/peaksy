import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { ValidationError, NotFoundError, ConflictError } from '../../lib/errors';
import {
  isDateAfterToday,
  formatDateForDB,
  getTodayInTimezone,
  eachCalendarDateInRangeInclusive,
} from '../../lib/dates';
import { isValidInternationalPhone } from '../../lib/phone';
import { notifyOrderPaid } from '../../lib/orderNotifications';
import { isTimeWithinWindow, isValidHhRoundHour } from '../../lib/timeOfDay';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

const checkoutSchema = z.object({
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z
    .string()
    .min(1)
    .regex(/^([01]\d|2[0-3]):00$/, 'Hora de levantamento: apenas horas cheias (ex.: 13:00, 14:00).'),
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
});

export async function publicRoutes(fastify: FastifyInstance) {
  // Helper function for hooks
  const requireTenant = async (request: any, reply: any) => {
    // Tenant should already be resolved by tenantResolver plugin's onRequest hook
    if (!request.tenant) {
      throw new NotFoundError('Tenant not found. Use X-Tenant-Slug header or correct Host header.');
    }
  };

  // GET /public/bakery — nome público da padaria (resolve por X-Tenant-Slug)
  fastify.get(
    '/public/bakery',
    {
      schema: {
        description: 'Dados públicos da padaria (nome)',
        tags: ['public'],
        response: {
          200: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              slug: { type: 'string' },
            },
          },
        },
      },
      onRequest: [requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      return { name: tenant.name, slug: tenant.slug };
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
          bakeryId: tenant.bakeryId,
          active: true,
        },
        orderBy: {
          pickupDate: 'asc',
        },
      });

      const expanded: Array<{
        id: string;
        pickupDate: string;
        orderDeadline: string;
        pickupTimeMin: string;
        pickupTimeMax: string;
        canOrder: boolean;
        dayCapTotal: number | null;
      }> = [];

      for (const row of rows) {
        const start = formatDateForDB(row.pickupDate);
        const end = formatDateForDB(row.pickupEndDate);
        const dates = eachCalendarDateInRangeInclusive(start, end, tenant.timezone);
        for (const pickupDate of dates) {
          if (pickupDate < todayStr) continue;
          const canOrder =
            isDateAfterToday(pickupDate, tenant.timezone) && new Date(row.orderDeadline) > now;
          expanded.push({
            id: row.id,
            pickupDate,
            orderDeadline: row.orderDeadline.toISOString(),
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
        bakeryId: tenant.bakeryId,
        active: true,
      };

      // If pickupDate provided, verify the day is active
      if (pickupDate) {
        const windows = await fastify.prisma.availableDay.findMany({
          where: {
            bakeryId: tenant.bakeryId,
            active: true,
          },
        });
        const match = windows.find((r) => {
          const s = formatDateForDB(r.pickupDate);
          const e = formatDateForDB(r.pickupEndDate);
          return pickupDate >= s && pickupDate <= e;
        });

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
            pickupTime: { type: 'string', description: 'HH:00 (hora cheia)' },
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
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              checkoutUrl: { type: 'string' },
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

      // Validate pickup date is in the future
      if (!isDateAfterToday(data.pickupDate, tenant.timezone)) {
        throw new ValidationError('Pickup date must be in the future');
      }

      const windows = await fastify.prisma.availableDay.findMany({
        where: {
          bakeryId: tenant.bakeryId,
          active: true,
        },
        include: {
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

      // Check deadline
      if (new Date(availableDay.orderDeadline) < new Date()) {
        throw new ValidationError('Order deadline has passed');
      }

      const pt = data.pickupTime.trim();
      if (!isValidHhRoundHour(pt)) {
        throw new ValidationError('Hora de levantamento: apenas horas cheias (ex.: 13:00).');
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
          bakeryId: tenant.bakeryId,
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
          // Count paid orders for this product on this day
          const paidOrdersForProduct = await fastify.prisma.orderItem.aggregate({
            where: {
              productId: product.id,
              order: {
                availableDayId: availableDay.id,
                paid: true,
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

      // Check day cap if exists
      if (availableDay.dayCapTotal) {
        const paidOrdersTotal = await fastify.prisma.order.aggregate({
          where: {
            availableDayId: availableDay.id,
            paid: true,
          },
          _sum: {
            totalCents: true,
          },
        });

        const currentTotal = (paidOrdersTotal._sum.totalCents || 0) + totalCents;
        if (currentTotal > availableDay.dayCapTotal * 100) {
          // dayCapTotal is in euros, convert to cents
          throw new ConflictError('Day total cap exceeded');
        }
      }

      // Create order (unpaid)
      const order = await fastify.prisma.order.create({
        data: {
          bakeryId: tenant.bakeryId,
          availableDayId: availableDay.id,
          pickupDate: new Date(data.pickupDate),
          pickupTime: pt,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone.trim(),
          customerEmail: data.customerEmail?.trim() || null,
          notes: data.notes?.trim().substring(0, 40) || null,
          totalCents,
          paid: false,
          status: 'RECEIVED',
          items: {
            create: orderItems,
          },
        },
      });

      // Create Stripe Checkout Session
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe not configured');
      }

      const frontendBase =
        process.env.FRONTEND_URL ||
        (request.headers.origin as string | undefined) ||
        'http://localhost:5173';

      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create({
          // cartão, MB WAY (Portugal); outros métodos podem ser ativados no Dashboard Stripe
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
          success_url: `${frontendBase.replace(/\/$/, '')}/loja/${tenant.slug}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendBase.replace(/\/$/, '')}/loja/${tenant.slug}/cancelar`,
          metadata: {
            orderId: order.id,
            bakeryId: tenant.bakeryId,
          },
        });
      } catch (stripeErr: unknown) {
        request.log.error({ err: stripeErr }, 'Stripe checkout.sessions.create failed');
        throw new ValidationError('Não foi possível iniciar o pagamento. Tenta novamente.');
      }

      // Update order with session ID
      await fastify.prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });

      return {
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
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      let event: Stripe.Event;

      try {
        // Fastify raw body handling
        const body = (request as any).rawBody || request.body || '';
        const bodyString = typeof body === 'string' ? body : body.toString();
        event = stripe.webhooks.constructEvent(bodyString, sig, webhookSecret);
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
}

