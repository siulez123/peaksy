import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { NotFoundError, ValidationError, ForbiddenError } from '../../lib/errors';
import { formatDateForDB } from '../../lib/dates';

const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  variant: z.string().min(1).max(100),
  priceCents: z.number().int().positive(),
  active: z.boolean().optional().default(true),
});

const productUpdateSchema = productCreateSchema.partial();

const availableDayCreateSchema = z.object({
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orderDeadline: z.string().datetime(),
  active: z.boolean().optional().default(true),
  dayCapTotal: z.number().int().positive().optional(),
});

const availableDayUpdateSchema = availableDayCreateSchema.partial();

const productCapSchema = z.object({
  productId: z.string().uuid(),
  cap: z.number().int().positive(),
});

const orderStatusUpdateSchema = z.object({
  status: z.enum(['READY', 'PICKED_UP']),
});

export async function adminRoutes(fastify: FastifyInstance) {
  // Helper functions for hooks
  const requireBakeryAdmin = async (request: any, reply: any) => {
    await fastify.requireBakeryAdmin(request);
  };
  const requireTenant = async (request: any, reply: any) => {
    await fastify.requireTenant(request);
  };
  // Products CRUD
  // GET /admin/products
  fastify.get(
    '/admin/products',
    {
      schema: {
        description: 'List all products for bakery',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
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
                active: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const products = await fastify.prisma.product.findMany({
        where: { bakeryId: tenant.bakeryId },
        orderBy: [{ name: 'asc' }, { variant: 'asc' }],
      });

      return products;
    }
  );

  // POST /admin/products
  fastify.post(
    '/admin/products',
    {
      schema: {
        description: 'Create a product',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'variant', 'priceCents'],
          properties: {
            name: { type: 'string' },
            variant: { type: 'string' },
            priceCents: { type: 'number' },
            active: { type: 'boolean' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              variant: { type: 'string' },
              priceCents: { type: 'number' },
              active: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const data = productCreateSchema.parse(request.body);

      const product = await fastify.prisma.product.create({
        data: {
          ...data,
          bakeryId: tenant.bakeryId,
        },
      });

      return reply.status(201).send(product);
    }
  );

  // GET /admin/products/:id
  fastify.get(
    '/admin/products/:id',
    {
      schema: {
        description: 'Get a product',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const product = await fastify.prisma.product.findFirst({
        where: {
          id,
          bakeryId: tenant.bakeryId,
        },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return product;
    }
  );

  // PATCH /admin/products/:id
  fastify.patch(
    '/admin/products/:id',
    {
      schema: {
        description: 'Update a product',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };
      const data = productUpdateSchema.parse(request.body);

      const product = await fastify.prisma.product.updateMany({
        where: {
          id,
          bakeryId: tenant.bakeryId,
        },
        data,
      });

      if (product.count === 0) {
        throw new NotFoundError('Product not found');
      }

      const updated = await fastify.prisma.product.findUnique({
        where: { id },
      });

      return updated;
    }
  );

  // DELETE /admin/products/:id
  fastify.delete(
    '/admin/products/:id',
    {
      schema: {
        description: 'Delete a product',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const product = await fastify.prisma.product.deleteMany({
        where: {
          id,
          bakeryId: tenant.bakeryId,
        },
      });

      if (product.count === 0) {
        throw new NotFoundError('Product not found');
      }

      return { success: true };
    }
  );

  // Available Days CRUD
  // GET /admin/available-days
  fastify.get(
    '/admin/available-days',
    {
      schema: {
        description: 'List available days',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            pickupDate: { type: 'string', format: 'date' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { pickupDate } = request.query as { pickupDate?: string };

      const where: any = {
        bakeryId: tenant.bakeryId,
      };

      if (pickupDate) {
        where.pickupDate = new Date(pickupDate);
      }

      const days = await fastify.prisma.availableDay.findMany({
        where,
        orderBy: { pickupDate: 'asc' },
        include: {
          productCaps: {
            include: {
              product: true,
            },
          },
        },
      });

      return days.map((day) => ({
        ...day,
        pickupDate: formatDateForDB(day.pickupDate),
      }));
    }
  );

  // POST /admin/available-days
  fastify.post(
    '/admin/available-days',
    {
      schema: {
        description: 'Create an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['pickupDate', 'orderDeadline'],
          properties: {
            pickupDate: { type: 'string', format: 'date' },
            orderDeadline: { type: 'string', format: 'date-time' },
            active: { type: 'boolean' },
            dayCapTotal: { type: 'number' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const data = availableDayCreateSchema.parse(request.body);

      const day = await fastify.prisma.availableDay.create({
        data: {
          ...data,
          pickupDate: new Date(data.pickupDate),
          orderDeadline: new Date(data.orderDeadline),
          bakeryId: tenant.bakeryId,
        },
      });

      return reply.status(201).send({
        ...day,
        pickupDate: formatDateForDB(day.pickupDate),
      });
    }
  );

  // PATCH /admin/available-days/:id
  fastify.patch(
    '/admin/available-days/:id',
    {
      schema: {
        description: 'Update an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };
      const data = availableDayUpdateSchema.parse(request.body);

      const updateData: any = { ...data };
      if (data.pickupDate) {
        updateData.pickupDate = new Date(data.pickupDate);
      }
      if (data.orderDeadline) {
        updateData.orderDeadline = new Date(data.orderDeadline);
      }

      const day = await fastify.prisma.availableDay.updateMany({
        where: {
          id,
          bakeryId: tenant.bakeryId,
        },
        data: updateData,
      });

      if (day.count === 0) {
        throw new NotFoundError('Available day not found');
      }

      const updated = await fastify.prisma.availableDay.findUnique({
        where: { id },
      });

      return {
        ...updated,
        pickupDate: formatDateForDB(updated!.pickupDate),
      };
    }
  );

  // DELETE /admin/available-days/:id
  fastify.delete(
    '/admin/available-days/:id',
    {
      schema: {
        description: 'Delete an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const day = await fastify.prisma.availableDay.deleteMany({
        where: {
          id,
          bakeryId: tenant.bakeryId,
        },
      });

      if (day.count === 0) {
        throw new NotFoundError('Available day not found');
      }

      return { success: true };
    }
  );

  // Product Caps
  // GET /admin/available-days/:id/product-caps
  fastify.get(
    '/admin/available-days/:id/product-caps',
    {
      schema: {
        description: 'Get product caps for an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const day = await fastify.prisma.availableDay.findFirst({
        where: {
          id,
          bakeryId: tenant.bakeryId,
        },
      });

      if (!day) {
        throw new NotFoundError('Available day not found');
      }

      const caps = await fastify.prisma.availableDayProductCap.findMany({
        where: {
          availableDayId: id,
          bakeryId: tenant.bakeryId,
        },
        include: {
          product: true,
        },
      });

      return caps;
    }
  );

  // POST /admin/available-days/:id/product-caps
  fastify.post(
    '/admin/available-days/:id/product-caps',
    {
      schema: {
        description: 'Create or update product cap',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['productId', 'cap'],
          properties: {
            productId: { type: 'string' },
            cap: { type: 'number' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };
      const data = productCapSchema.parse(request.body);

      // Verify day and product belong to bakery
      const [day, product] = await Promise.all([
        fastify.prisma.availableDay.findFirst({
          where: { id, bakeryId: tenant.bakeryId },
        }),
        fastify.prisma.product.findFirst({
          where: { id: data.productId, bakeryId: tenant.bakeryId },
        }),
      ]);

      if (!day) {
        throw new NotFoundError('Available day not found');
      }
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const cap = await fastify.prisma.availableDayProductCap.upsert({
        where: {
          availableDayId_productId: {
            availableDayId: id,
            productId: data.productId,
          },
        },
        update: { cap: data.cap },
        create: {
          bakeryId: tenant.bakeryId,
          availableDayId: id,
          productId: data.productId,
          cap: data.cap,
        },
      });

      return reply.status(201).send(cap);
    }
  );

  // DELETE /admin/available-days/:id/product-caps/:productId
  fastify.delete(
    '/admin/available-days/:id/product-caps/:productId',
    {
      schema: {
        description: 'Delete product cap',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productId: { type: 'string' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id, productId } = request.params as {
        id: string;
        productId: string;
      };

      const cap = await fastify.prisma.availableDayProductCap.deleteMany({
        where: {
          availableDayId: id,
          productId,
          bakeryId: tenant.bakeryId,
        },
      });

      if (cap.count === 0) {
        throw new NotFoundError('Product cap not found');
      }

      return { success: true };
    }
  );

  // Orders
  // GET /admin/orders
  fastify.get(
    '/admin/orders',
    {
      schema: {
        description: 'List orders',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            pickupDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['RECEIVED', 'READY', 'PICKED_UP'] },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { pickupDate, status } = request.query as {
        pickupDate?: string;
        status?: string;
      };

      const where: any = {
        bakeryId: tenant.bakeryId,
      };

      if (pickupDate) {
        where.pickupDate = new Date(pickupDate);
      }

      if (status) {
        where.status = status;
      }

      const orders = await fastify.prisma.order.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return orders.map((order) => ({
        ...order,
        pickupDate: formatDateForDB(order.pickupDate),
      }));
    }
  );

  // PATCH /admin/orders/:id/status
  fastify.patch(
    '/admin/orders/:id/status',
    {
      schema: {
        description: 'Update order status',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['READY', 'PICKED_UP'] },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };
      const { status } = orderStatusUpdateSchema.parse(request.body);

      const order = await fastify.prisma.order.updateMany({
        where: {
          id,
          bakeryId: tenant.bakeryId,
        },
        data: { status },
      });

      if (order.count === 0) {
        throw new NotFoundError('Order not found');
      }

      const updated = await fastify.prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      return {
        ...updated,
        pickupDate: formatDateForDB(updated!.pickupDate),
      };
    }
  );

  // GET /admin/orders/summary
  fastify.get(
    '/admin/orders/summary',
    {
      schema: {
        description: 'Get order summary for production',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            pickupDate: { type: 'string', format: 'date' },
          },
        },
      },
      onRequest: [requireBakeryAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.bakeryId !== tenant.bakeryId) {
        throw new ForbiddenError('Access denied');
      }

      const { pickupDate } = request.query as { pickupDate?: string };

      if (!pickupDate) {
        throw new ValidationError('pickupDate is required');
      }

      const orders = await fastify.prisma.order.findMany({
        where: {
          bakeryId: tenant.bakeryId,
          pickupDate: new Date(pickupDate),
          paid: true,
        },
        include: {
          items: true,
        },
      });

      // Aggregate by product
      const productTotals: Record<
        string,
        {
          productName: string;
          variant: string;
          totalQuantity: number;
        }
      > = {};

      for (const order of orders) {
        for (const item of order.items) {
          const key = `${item.productNameSnapshot}_${item.variantSnapshot}`;
          if (!productTotals[key]) {
            productTotals[key] = {
              productName: item.productNameSnapshot,
              variant: item.variantSnapshot,
              totalQuantity: 0,
            };
          }
          productTotals[key].totalQuantity += item.quantity;
        }
      }

      const statusCounts = {
        RECEIVED: orders.filter((o) => o.status === 'RECEIVED').length,
        READY: orders.filter((o) => o.status === 'READY').length,
        PICKED_UP: orders.filter((o) => o.status === 'PICKED_UP').length,
      };

      return {
        pickupDate,
        productTotals: Object.values(productTotals),
        statusCounts,
        totalOrders: orders.length,
      };
    }
  );
}

