import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { ValidationError, NotFoundError, ConflictError } from '../../lib/errors';
import { isDateAfterToday, formatDateForDB } from '../../lib/dates';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

const checkoutSchema = z.object({
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(1).max(50),
  customerEmail: z.string().email().optional(),
  notes: z.string().max(100).optional(),
});

export async function publicRoutes(fastify: FastifyInstance) {
  // Helper function for hooks
  const requireTenant = async (request: any, reply: any) => {
    // Tenant should already be resolved by tenantResolver plugin's onRequest hook
    if (!request.tenant) {
      throw new NotFoundError('Tenant not found. Use X-Tenant-Slug header or correct Host header.');
    }
  };
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
      const today = new Date();
      const todayStr = formatDateForDB(today);

      const availableDays = await fastify.prisma.availableDay.findMany({
        where: {
          bakeryId: tenant.bakeryId,
          active: true,
          pickupDate: {
            gte: new Date(todayStr),
          },
        },
        orderBy: {
          pickupDate: 'asc',
        },
      });

      const now = new Date();

      return availableDays.map((day) => {
        const canOrder =
          new Date(day.pickupDate) > today &&
          new Date(day.orderDeadline) > now &&
          isDateAfterToday(day.pickupDate, tenant.timezone);

        return {
          id: day.id,
          pickupDate: formatDateForDB(day.pickupDate),
          orderDeadline: day.orderDeadline.toISOString(),
          canOrder,
          dayCapTotal: day.dayCapTotal,
        };
      });
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

      // Ensure Prisma is available
      if (!fastify.prisma) {
        throw new Error('Prisma client not available');
      }

      const where: any = {
        bakeryId: tenant.bakeryId,
        active: true,
      };

      // If pickupDate provided, verify the day is active
      if (pickupDate) {
        const availableDay = await fastify.prisma.availableDay.findFirst({
          where: {
            bakeryId: tenant.bakeryId,
            pickupDate: new Date(pickupDate),
            active: true,
          },
        });

        if (!availableDay) {
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
          required: ['pickupDate', 'items', 'customerName', 'customerPhone'],
          properties: {
            pickupDate: { type: 'string', format: 'date' },
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
            notes: { type: 'string', maxLength: 100 },
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

      // Find available day
      const availableDay = await fastify.prisma.availableDay.findFirst({
        where: {
          bakeryId: tenant.bakeryId,
          pickupDate: new Date(data.pickupDate),
          active: true,
        },
        include: {
          productCaps: true,
        },
      });

      if (!availableDay) {
        throw new NotFoundError('Available day not found');
      }

      // Check deadline
      if (new Date(availableDay.orderDeadline) < new Date()) {
        throw new ValidationError('Order deadline has passed');
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
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone.trim(),
          customerEmail: data.customerEmail?.trim() || null,
          notes: data.notes?.trim().substring(0, 100) || null,
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

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
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
        success_url: `${request.headers.origin || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${request.headers.origin || 'http://localhost:3000'}/cancel`,
        metadata: {
          orderId: order.id,
          bakeryId: tenant.bakeryId,
        },
      });

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
          await fastify.prisma.order.update({
            where: { id: orderId },
            data: {
              paid: true,
              stripeSessionId: session.id,
            },
          });

          request.log.info({ orderId }, 'Order marked as paid');
        }
      }

      return { received: true };
    }
  );
}

