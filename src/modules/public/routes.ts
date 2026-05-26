import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { ValidationError, NotFoundError } from '../../lib/errors';
import {
  formatDateForDB,
  getTodayInTimezone,
  isDateTodayOrAfter,
} from '../../lib/dates';
import { resolveInStoreVerification } from '../../lib/inStoreVerification';
import { lojaHasSmtp, lojaNotificationSelect } from '../../lib/lojaNotificationConfig';
import { createInStoreOrder } from '../../lib/createInStoreOrder';
import {
  getStripeClient,
  lojaHasStripe,
  lojaStripePaymentMethodTypes,
  lojaStripeSelect,
} from '../../lib/lojaStripeConfig';
import { notifyOrderInStore, notifyOrderPaid } from '../../lib/orderNotifications';
import { publicAnalyticsRoutes } from './analyticsRoutes';
import { phoneCheckoutRoutes } from './phoneCheckoutRoutes';
import { checkoutSchema, frontendBaseUrl, validateCheckoutRequest } from '../../lib/checkoutValidation';
import { vatCentsFromGrossCents, summarizeVatByRate } from '../../lib/vatAmounts';

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
              collectCustomerEmail: { type: 'boolean' },
              inStoreVerification: { type: 'string', enum: ['none', 'sms', 'email'] },
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
          inStoreVerifySms: true,
          inStoreVerifyEmail: true,
          productDisplayLayout: true,
          colorPalette: true,
          ...lojaNotificationSelect,
          ...lojaStripeSelect,
        },
      });
      if (!loja) {
        throw new NotFoundError('Loja not found');
      }
      const inStoreVerification = resolveInStoreVerification(loja);
      const smtpOk = lojaHasSmtp(loja);
      return {
        name: loja.name,
        slug: loja.slug,
        addressLine: loja.addressLine,
        postalCode: loja.postalCode,
        locality: loja.locality,
        phone: loja.phone,
        allowOnlinePayment: loja.allowOnlinePayment && lojaHasStripe(loja),
        allowInStorePayment: loja.allowInStorePayment,
        collectCustomerEmail: smtpOk,
        inStoreVerification,
        productDisplayLayout: loja.productDisplayLayout,
        colorPalette: loja.colorPalette,
      };
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

      const validated = await validateCheckoutRequest(fastify.prisma, tenant, data);

      if (data.paymentMethod === 'IN_STORE') {
        const lojaPay = await fastify.prisma.loja.findUnique({
          where: { id: tenant.lojaId },
          select: {
            allowInStorePayment: true,
            inStoreVerifySms: true,
            inStoreVerifyEmail: true,
          },
        });
        const mode = lojaPay ? resolveInStoreVerification(lojaPay) : 'none';
        if (mode === 'sms') {
          throw new ValidationError(
            'Confirma a encomenda com o código SMS enviado para o teu telemóvel.'
          );
        }
        if (mode === 'email') {
          throw new ValidationError(
            'Confirma a encomenda com o código enviado para o teu email.'
          );
        }

        const { successRel } = validated;
        const baseUrl = frontendBaseUrl(request.headers.origin as string | undefined);
        const order = await createInStoreOrder(fastify.prisma, tenant.lojaId, validated);
        await notifyOrderInStore(order.id, fastify.prisma, request.log).catch((e) => {
          request.log.error({ err: e }, 'notifyOrderInStore failed');
        });
        return {
          paymentMethod: 'IN_STORE' as const,
          successUrl: `${baseUrl}${successRel}?order_id=${order.id}`,
        };
      }
      const { data: vData, orderItems, totalCents, pickupTime: pt, successRel, cancelRel } =
        validated;

      const lojaStripe = await fastify.prisma.loja.findUnique({
        where: { id: tenant.lojaId },
        select: lojaStripeSelect,
      });
      const stripeKey = lojaStripe?.stripeSecretKey?.trim();
      if (!stripeKey) {
        throw new ValidationError('Pagamento online não está configurado nesta loja.');
      }
      const stripe = getStripeClient(stripeKey);
      const paymentMethodTypes = lojaStripePaymentMethodTypes(lojaStripe!);

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
        session = await stripe.checkout.sessions.create({
          payment_method_types: paymentMethodTypes,
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

  // POST /public/webhooks/stripe/:tenantSlug — um endpoint por loja (secret próprio)
  fastify.post(
    '/public/webhooks/stripe/:tenantSlug',
    {
      schema: {
        description: 'Stripe webhook handler (por loja)',
        tags: ['public'],
      },
      config: {
        rawBody: true,
      },
    },
    async (request, reply) => {
      const tenantSlug = (request.params as { tenantSlug: string }).tenantSlug?.trim();
      if (!tenantSlug) {
        return reply.status(400).send({ error: 'Slug em falta' });
      }

      const loja = await fastify.prisma.loja.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, stripeSecretKey: true, stripeWebhookSecret: true },
      });
      const stripeKey = loja?.stripeSecretKey?.trim();
      const webhookSecret = loja?.stripeWebhookSecret?.trim();
      if (!loja || !stripeKey || !webhookSecret) {
        request.log.warn({ tenantSlug }, 'Stripe webhook: loja sem Stripe configurado');
        return reply.status(404).send({ error: 'Stripe não configurado para esta loja' });
      }

      const sig = request.headers['stripe-signature'] as string;
      let event: Stripe.Event;

      try {
        const body = (request as { rawBody?: Buffer | string }).rawBody || request.body || '';
        const bodyString = typeof body === 'string' ? body : body.toString();
        event = getStripeClient(stripeKey).webhooks.constructEvent(bodyString, sig, webhookSecret);
      } catch (err: unknown) {
        request.log.warn({ err, tenantSlug }, 'Stripe webhook signature verification failed');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const metaLojaId = session.metadata?.lojaId;

        if (metaLojaId && metaLojaId !== loja.id) {
          request.log.warn({ orderId, metaLojaId, lojaId: loja.id }, 'Webhook: lojaId não coincide');
          return { received: true };
        }

        if (orderId) {
          const existing = await fastify.prisma.order.findFirst({
            where: { id: orderId, lojaId: loja.id },
          });
          if (!existing) {
            request.log.warn({ orderId, tenantSlug }, 'Webhook: encomenda não encontrada');
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
        customerPhone: order.customerPhone,
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

