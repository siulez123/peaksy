import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { ValidationError, NotFoundError } from '../../lib/errors';
import {
  formatDateForDB,
  getTodayInTimezone,
  isDateTodayOrAfter,
} from '../../lib/dates';
import { notifyOrderPaid } from '../../lib/orderNotifications';
import { publicAnalyticsRoutes } from './analyticsRoutes';
import { phoneCheckoutRoutes } from './phoneCheckoutRoutes';
import { checkoutSchema, frontendBaseUrl, validateCheckoutRequest } from '../../lib/checkoutValidation';
import { vatCentsFromGrossCents, summarizeVatByRate } from '../../lib/vatAmounts';

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
              productDisplayLayout: { type: 'string', enum: ['LARGE', 'MEDIUM', 'SMALL'] },
              colorPalette: { type: 'string', enum: ['INDIGO', 'TEAL', 'ROSE', 'AMBER'] },
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
          productDisplayLayout: true,
          colorPalette: true,
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
                vatRatePercent: { type: 'number' },
                vatRateLabel: { type: 'string' },
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

      const where: {
        lojaId: string;
        active: boolean;
      } = {
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
        include: { vatRate: true },
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
        vatRatePercent: Number(p.vatRate.ratePercent),
        vatRateLabel: p.vatRate.label,
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

      if (data.paymentMethod === 'IN_STORE') {
        throw new ValidationError(
          'Confirma a encomenda com o código SMS enviado para o teu telemóvel.'
        );
      }

      const validated = await validateCheckoutRequest(fastify.prisma, tenant, data);
      const { data: vData, orderItems, totalCents, pickupTime: pt, successRel, cancelRel } =
        validated;

      const baseUrl = frontendBaseUrl(request.headers.origin as string | undefined);

      const order = await fastify.prisma.order.create({
        data: {
          lojaId: tenant.lojaId,
          availableDayId: validated.availableDayId,
          pickupDate: new Date(vData.pickupDate),
          pickupTime: pt,
          customerName: vData.customerName.trim(),
          customerPhone: vData.customerPhone.trim(),
          customerEmail: vData.customerEmail?.trim() || null,
          notes: vData.notes?.trim().substring(0, 40) || null,
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

      const itemRows = order.items.map((it) => {
        const lineCents = it.unitPriceCentsSnapshot * it.quantity;
        const ratePercent = Number(it.vatRatePercentSnapshot);
        return {
          productName: it.productNameSnapshot,
          variant: it.variantSnapshot,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCentsSnapshot,
          lineCents,
          vatRatePercent: ratePercent,
          vatRateLabel: it.vatRateLabelSnapshot,
          lineVatCents: vatCentsFromGrossCents(lineCents, ratePercent),
        };
      });

      const vatSummary = summarizeVatByRate(
        itemRows.map((it) => ({
          grossCents: it.lineCents,
          ratePercent: it.vatRatePercent,
          label: it.vatRateLabel,
        }))
      );

      return {
        orderRef: order.id.slice(0, 8).toUpperCase(),
        lojaName: order.loja.name,
        customerName: order.customerName,
        pickupDate: formatDateForDB(order.pickupDate),
        pickupTime: order.pickupTime,
        totalCents: order.totalCents,
        totalVatCents: itemRows.reduce((s, it) => s + it.lineVatCents, 0),
        vatSummary: vatSummary.map((r) => ({
          label: r.label,
          ratePercent: r.ratePercent,
          grossCents: r.grossCents,
          vatCents: r.vatCents,
        })),
        paymentMethod: order.paymentMethod,
        paid: order.paid,
        notes: order.notes,
        items: itemRows,
      };
    }
  );

  await fastify.register(phoneCheckoutRoutes);
  await fastify.register(publicAnalyticsRoutes);
}

