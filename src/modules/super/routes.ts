import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';
import { analyticsCreatedAtWhere } from '../../lib/analytics';

const lojaCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  domain: z.string().max(255).optional(),
  timezone: z.string().default('Europe/Lisbon'),
  active: z.boolean().default(true),
  plan: z.enum(['STARTER', 'PRO', 'PREMIUM']).default('STARTER'),
  addressLine: z.string().min(1).max(500),
  postalCode: z.string().min(1).max(20),
  locality: z.string().min(1).max(120),
  phone: z.string().min(6).max(50),
});

/** PATCH: todos os campos opcionais; `domain` pode ser `null` para limpar. */
const lojaUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  domain: z.union([z.string().max(255), z.null()]).optional(),
  timezone: z.string().min(1).optional(),
  active: z.boolean().optional(),
  plan: z.enum(['STARTER', 'PRO', 'PREMIUM']).optional(),
  addressLine: z.string().min(1).max(500).optional(),
  postalCode: z.string().min(1).max(20).optional(),
  locality: z.string().min(1).max(120).optional(),
  phone: z.string().min(6).max(50).optional(),
});

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'LOJA_ADMIN']),
  lojaId: z.string().uuid().optional(),
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['SUPER_ADMIN', 'LOJA_ADMIN']).optional(),
  lojaId: z.string().uuid().nullable().optional(),
});

function orderCreatedAtWhere(from?: string, to?: string) {
  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
  }
  return where;
}

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function averageTicketCents(revenueCents: number, paidOrders: number): number {
  if (paidOrders === 0) return 0;
  return Math.round(revenueCents / paidOrders);
}

export async function superRoutes(fastify: FastifyInstance) {
  // Helper function for hooks
  const requireSuperAdmin = async (request: any, reply: any) => {
    await fastify.requireSuperAdmin(request);
  };
  // Bakeries CRUD
  // GET /super/lojas
  fastify.get(
    '/super/lojas',
    {
      schema: {
        description: 'List all bakeries',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            active: { type: 'boolean' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { active } = request.query as { active?: boolean };

      const where: any = {};
      if (active !== undefined) {
        where.active = active;
      }

      const bakeries = await fastify.prisma.loja.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              orders: true,
            },
          },
        },
      });

      return bakeries;
    }
  );

  // POST /super/lojas
  fastify.post(
    '/super/lojas',
    {
      schema: {
        description: 'Create a loja',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'slug', 'addressLine', 'postalCode', 'locality', 'phone'],
          properties: {
            name: { type: 'string' },
            slug: { type: 'string' },
            domain: { type: 'string' },
            timezone: { type: 'string' },
            active: { type: 'boolean' },
            plan: { type: 'string', enum: ['STARTER', 'PRO', 'PREMIUM'] },
            addressLine: { type: 'string' },
            postalCode: { type: 'string' },
            locality: { type: 'string' },
            phone: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const data = lojaCreateSchema.parse(request.body);

      // Check slug uniqueness
      const existing = await fastify.prisma.loja.findUnique({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new ConflictError('Slug already exists');
      }

      // Check domain uniqueness if provided
      if (data.domain) {
        const existingDomain = await fastify.prisma.loja.findUnique({
          where: { domain: data.domain },
        });

        if (existingDomain) {
          throw new ConflictError('Domain already exists');
        }
      }

      const loja = await fastify.prisma.loja.create({
        data,
      });

      return reply.status(201).send(loja);
    }
  );

  // GET /super/lojas/:id
  fastify.get(
    '/super/lojas/:id',
    {
      schema: {
        description: 'Get a loja',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const loja = await fastify.prisma.loja.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              orders: true,
            },
          },
        },
      });

      if (!loja) {
        throw new NotFoundError('Loja not found');
      }

      return loja;
    }
  );

  // PATCH /super/lojas/:id
  fastify.patch(
    '/super/lojas/:id',
    {
      schema: {
        description: 'Update a loja',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = lojaUpdateSchema.parse(request.body);

      // Check slug uniqueness if updating
      if (data.slug) {
        const existing = await fastify.prisma.loja.findFirst({
          where: {
            slug: data.slug,
            id: { not: id },
          },
        });

        if (existing) {
          throw new ConflictError('Slug already exists');
        }
      }

      // Check domain uniqueness if updating
      if (data.domain) {
        const existingDomain = await fastify.prisma.loja.findFirst({
          where: {
            domain: data.domain,
            id: { not: id },
          },
        });

        if (existingDomain) {
          throw new ConflictError('Domain already exists');
        }
      }

      const loja = await fastify.prisma.loja.update({
        where: { id },
        data,
      });

      return loja;
    }
  );

  // DELETE /super/lojas/:id
  fastify.delete(
    '/super/lojas/:id',
    {
      schema: {
        description: 'Delete a loja',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const loja = await fastify.prisma.loja.delete({
        where: { id },
      });

      return { success: true };
    }
  );

  // Users CRUD
  // GET /super/users
  fastify.get(
    '/super/users',
    {
      schema: {
        description: 'List all users',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['SUPER_ADMIN', 'LOJA_ADMIN'] },
            lojaId: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { role, lojaId } = request.query as {
        role?: string;
        lojaId?: string;
      };

      const where: any = {};
      if (role) {
        where.role = role;
      }
      if (lojaId) {
        where.lojaId = lojaId;
      }

      const users = await fastify.prisma.user.findMany({
        where,
        include: {
          loja: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        lojaId: user.lojaId,
        loja: user.loja
          ? {
              id: user.loja.id,
              name: user.loja.name,
              slug: user.loja.slug,
            }
          : null,
        createdAt: user.createdAt,
      }));
    }
  );

  // POST /super/users
  fastify.post(
    '/super/users',
    {
      schema: {
        description: 'Create a user',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'password', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            role: { type: 'string', enum: ['SUPER_ADMIN', 'LOJA_ADMIN'] },
            lojaId: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const data = userCreateSchema.parse(request.body);

      // Validate loja admin has lojaId
      if (data.role === 'LOJA_ADMIN' && !data.lojaId) {
        throw new ValidationError('Loja admin must have a lojaId');
      }

      // Validate super admin has no lojaId
      if (data.role === 'SUPER_ADMIN' && data.lojaId) {
        throw new ValidationError('Super admin cannot have a lojaId');
      }

      // Check email uniqueness
      const existing = await fastify.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        throw new ConflictError('Email already exists');
      }

      // Verify loja exists if provided
      if (data.lojaId) {
        const loja = await fastify.prisma.loja.findUnique({
          where: { id: data.lojaId },
        });

        if (!loja) {
          throw new NotFoundError('Loja not found');
        }
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      const user = await fastify.prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: data.role,
          lojaId: data.lojaId || null,
        },
        include: {
          loja: true,
        },
      });

      return reply.status(201).send({
        id: user.id,
        email: user.email,
        role: user.role,
        lojaId: user.lojaId,
        loja: user.loja
          ? {
              id: user.loja.id,
              name: user.loja.name,
              slug: user.loja.slug,
            }
          : null,
        createdAt: user.createdAt,
      });
    }
  );

  // PATCH /super/users/:id
  fastify.patch(
    '/super/users/:id',
    {
      schema: {
        description: 'Update a user',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = userUpdateSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const newRole = data.role ?? user.role;

      if (newRole === 'LOJA_ADMIN') {
        const effectiveLojaId =
          data.lojaId !== undefined && data.lojaId !== null ? data.lojaId : user.lojaId;
        if (!effectiveLojaId) {
          throw new ValidationError('Loja admin must have a lojaId');
        }
      }

      if (newRole === 'SUPER_ADMIN') {
        const effectiveLojaId =
          data.lojaId !== undefined ? data.lojaId : user.lojaId;
        if (effectiveLojaId != null) {
          throw new ValidationError('Super admin cannot have a lojaId');
        }
      }

      // Check email uniqueness if updating
      if (data.email && data.email !== user.email) {
        const existing = await fastify.prisma.user.findUnique({
          where: { email: data.email },
        });

        if (existing) {
          throw new ConflictError('Email already exists');
        }
      }

      // Verify loja exists if provided
      if (data.lojaId) {
        const loja = await fastify.prisma.loja.findUnique({
          where: { id: data.lojaId },
        });

        if (!loja) {
          throw new NotFoundError('Loja not found');
        }
      }

      const updateData: any = { ...data };
      if (data.password) {
        updateData.passwordHash = await bcrypt.hash(data.password, 10);
        delete updateData.password;
      }

      const updated = await fastify.prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          loja: true,
        },
      });

      return {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        lojaId: updated.lojaId,
        loja: updated.loja
          ? {
              id: updated.loja.id,
              name: updated.loja.name,
              slug: updated.loja.slug,
            }
          : null,
        createdAt: updated.createdAt,
      };
    }
  );

  // DELETE /super/users/:id
  fastify.delete(
    '/super/users/:id',
    {
      schema: {
        description: 'Delete a user',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      // Prevent deleting yourself
      if (id === request.user!.id) {
        throw new ValidationError('Cannot delete your own account');
      }

      const user = await fastify.prisma.user.delete({
        where: { id },
      });

      return { success: true };
    }
  );

  // Metrics
  // GET /super/metrics
  fastify.get(
    '/super/metrics',
    {
      schema: {
        description: 'Get global metrics',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { from, to } = request.query as {
        from?: string;
        to?: string;
      };

      const orderWhere = orderCreatedAtWhere(from, to);
      const paidOrderWhere = { ...orderWhere, paid: true };
      const last7From = daysAgoDate(7);
      const last30From = daysAgoDate(30);

      const [
        lojas,
        totalUsers,
        lojaAdminUsers,
        totalProducts,
        activeProducts,
        totalOrders,
        paidOrders,
        unpaidOrders,
        totalRevenue,
        ordersByStatus,
        recent7Orders,
        recent7Revenue,
        recent30Orders,
        recent30Revenue,
        orderCountsByLoja,
        paidStatsByLoja,
        orderStatusByLoja,
        activeProductsByLoja,
        recent7OrdersByLoja,
        recent7PaidByLoja,
        recent30OrdersByLoja,
        recent30PaidByLoja,
      ] = await Promise.all([
        fastify.prisma.loja.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            active: true,
            locality: true,
            _count: { select: { products: true } },
          },
          orderBy: { name: 'asc' },
        }),
        fastify.prisma.user.count(),
        fastify.prisma.user.count({ where: { role: 'LOJA_ADMIN' } }),
        fastify.prisma.product.count(),
        fastify.prisma.product.count({ where: { active: true } }),
        fastify.prisma.order.count({ where: orderWhere }),
        fastify.prisma.order.count({ where: paidOrderWhere }),
        fastify.prisma.order.count({ where: { ...orderWhere, paid: false } }),
        fastify.prisma.order.aggregate({
          where: paidOrderWhere,
          _sum: { totalCents: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['status'],
          where: orderWhere,
          _count: { _all: true },
        }),
        fastify.prisma.order.count({
          where: { createdAt: { gte: last7From } },
        }),
        fastify.prisma.order.aggregate({
          where: { paid: true, createdAt: { gte: last7From } },
          _sum: { totalCents: true },
        }),
        fastify.prisma.order.count({
          where: { createdAt: { gte: last30From } },
        }),
        fastify.prisma.order.aggregate({
          where: { paid: true, createdAt: { gte: last30From } },
          _sum: { totalCents: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['lojaId'],
          where: orderWhere,
          _count: { _all: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['lojaId'],
          where: paidOrderWhere,
          _count: { _all: true },
          _sum: { totalCents: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['lojaId', 'status'],
          where: orderWhere,
          _count: { _all: true },
        }),
        fastify.prisma.product.groupBy({
          by: ['lojaId'],
          where: { active: true },
          _count: { _all: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['lojaId'],
          where: { createdAt: { gte: last7From } },
          _count: { _all: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['lojaId'],
          where: { paid: true, createdAt: { gte: last7From } },
          _count: { _all: true },
          _sum: { totalCents: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['lojaId'],
          where: { createdAt: { gte: last30From } },
          _count: { _all: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['lojaId'],
          where: { paid: true, createdAt: { gte: last30From } },
          _count: { _all: true },
          _sum: { totalCents: true },
        }),
      ]);

      const revenueCents = totalRevenue._sum.totalCents || 0;
      const byStatus = {
        RECEIVED: 0,
        READY: 0,
        PICKED_UP: 0,
      };
      for (const row of ordersByStatus) {
        byStatus[row.status] = row._count._all;
      }

      const byPlan = { STARTER: 0, PRO: 0, PREMIUM: 0 };
      let activeLojas = 0;
      for (const loja of lojas) {
        byPlan[loja.plan] += 1;
        if (loja.active) activeLojas += 1;
      }

      const orderCountMap = new Map(
        orderCountsByLoja.map((row) => [row.lojaId, row._count._all])
      );
      const paidStatsMap = new Map(
        paidStatsByLoja.map((row) => [
          row.lojaId,
          { count: row._count._all, revenueCents: row._sum.totalCents || 0 },
        ])
      );

      const statusByLojaMap = new Map<string, { RECEIVED: number; READY: number; PICKED_UP: number }>();
      for (const row of orderStatusByLoja) {
        let entry = statusByLojaMap.get(row.lojaId);
        if (!entry) {
          entry = { RECEIVED: 0, READY: 0, PICKED_UP: 0 };
          statusByLojaMap.set(row.lojaId, entry);
        }
        entry[row.status] = row._count._all;
      }

      const activeProductsMap = new Map(
        activeProductsByLoja.map((row) => [row.lojaId, row._count._all])
      );

      const recent7OrdersMap = new Map(
        recent7OrdersByLoja.map((row) => [row.lojaId, row._count._all])
      );
      const recent7RevenueMap = new Map(
        recent7PaidByLoja.map((row) => [row.lojaId, row._sum.totalCents || 0])
      );
      const recent30OrdersMap = new Map(
        recent30OrdersByLoja.map((row) => [row.lojaId, row._count._all])
      );
      const recent30RevenueMap = new Map(
        recent30PaidByLoja.map((row) => [row.lojaId, row._sum.totalCents || 0])
      );

      const lojaRanking = lojas
        .map((loja) => {
          const orders = orderCountMap.get(loja.id) || 0;
          const paid = paidStatsMap.get(loja.id);
          const paidOrdersCount = paid?.count || 0;
          const lojaRevenue = paid?.revenueCents || 0;
          const byStatus = statusByLojaMap.get(loja.id) || {
            RECEIVED: 0,
            READY: 0,
            PICKED_UP: 0,
          };
          return {
            id: loja.id,
            name: loja.name,
            slug: loja.slug,
            plan: loja.plan,
            active: loja.active,
            locality: loja.locality,
            products: loja._count.products,
            activeProducts: activeProductsMap.get(loja.id) || 0,
            orders,
            paidOrders: paidOrdersCount,
            unpaidOrders: orders - paidOrdersCount,
            revenueCents: lojaRevenue,
            averageTicketCents: averageTicketCents(lojaRevenue, paidOrdersCount),
            byStatus,
            recent: {
              last7Days: {
                orders: recent7OrdersMap.get(loja.id) || 0,
                revenueCents: recent7RevenueMap.get(loja.id) || 0,
              },
              last30Days: {
                orders: recent30OrdersMap.get(loja.id) || 0,
                revenueCents: recent30RevenueMap.get(loja.id) || 0,
              },
            },
          };
        })
        .sort((a, b) => b.revenueCents - a.revenueCents || b.orders - a.orders);

      return {
        period: { from: from ?? null, to: to ?? null },
        lojas: {
          total: lojas.length,
          active: activeLojas,
          inactive: lojas.length - activeLojas,
          byPlan,
        },
        users: {
          total: totalUsers,
          lojaAdmins: lojaAdminUsers,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        orders: {
          total: totalOrders,
          paid: paidOrders,
          unpaid: unpaidOrders,
          averageTicketCents: averageTicketCents(revenueCents, paidOrders),
          byStatus,
        },
        revenue: {
          totalCents: revenueCents,
        },
        recent: {
          last7Days: {
            orders: recent7Orders,
            revenueCents: recent7Revenue._sum.totalCents || 0,
          },
          last30Days: {
            orders: recent30Orders,
            revenueCents: recent30Revenue._sum.totalCents || 0,
          },
        },
        lojaRanking,
      };
    }
  );

  // GET /super/lojas/:id/metrics
  fastify.get(
    '/super/lojas/:id/metrics',
    {
      schema: {
        description: 'Get metrics for a specific loja',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { from, to } = request.query as {
        from?: string;
        to?: string;
      };

      const loja = await fastify.prisma.loja.findUnique({
        where: { id },
      });

      if (!loja) {
        throw new NotFoundError('Loja not found');
      }

      const orderWhere = { lojaId: id, ...orderCreatedAtWhere(from, to) };
      const paidOrderWhere = { ...orderWhere, paid: true };

      const last7From = daysAgoDate(7);
      const last30From = daysAgoDate(30);

      const [
        totalProducts,
        activeProducts,
        totalOrders,
        paidOrders,
        unpaidOrders,
        totalRevenue,
        ordersByStatus,
        recent7Orders,
        recent7Revenue,
        recent30Orders,
        recent30Revenue,
      ] = await Promise.all([
        fastify.prisma.product.count({ where: { lojaId: id } }),
        fastify.prisma.product.count({ where: { lojaId: id, active: true } }),
        fastify.prisma.order.count({ where: orderWhere }),
        fastify.prisma.order.count({ where: paidOrderWhere }),
        fastify.prisma.order.count({ where: { ...orderWhere, paid: false } }),
        fastify.prisma.order.aggregate({
          where: paidOrderWhere,
          _sum: { totalCents: true },
        }),
        fastify.prisma.order.groupBy({
          by: ['status'],
          where: orderWhere,
          _count: { _all: true },
        }),
        fastify.prisma.order.count({
          where: { lojaId: id, createdAt: { gte: last7From } },
        }),
        fastify.prisma.order.aggregate({
          where: { lojaId: id, paid: true, createdAt: { gte: last7From } },
          _sum: { totalCents: true },
        }),
        fastify.prisma.order.count({
          where: { lojaId: id, createdAt: { gte: last30From } },
        }),
        fastify.prisma.order.aggregate({
          where: { lojaId: id, paid: true, createdAt: { gte: last30From } },
          _sum: { totalCents: true },
        }),
      ]);

      const revenueCents = totalRevenue._sum.totalCents || 0;
      const byStatus = {
        RECEIVED: 0,
        READY: 0,
        PICKED_UP: 0,
      };
      for (const row of ordersByStatus) {
        byStatus[row.status] = row._count._all;
      }

      return {
        period: { from: from ?? null, to: to ?? null },
        loja: {
          id: loja.id,
          name: loja.name,
          slug: loja.slug,
          plan: loja.plan,
          active: loja.active,
          locality: loja.locality,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        orders: {
          total: totalOrders,
          paid: paidOrders,
          unpaid: unpaidOrders,
          averageTicketCents: averageTicketCents(revenueCents, paidOrders),
          byStatus,
        },
        revenue: {
          totalCents: revenueCents,
        },
        recent: {
          last7Days: {
            orders: recent7Orders,
            revenueCents: recent7Revenue._sum.totalCents || 0,
          },
          last30Days: {
            orders: recent30Orders,
            revenueCents: recent30Revenue._sum.totalCents || 0,
          },
        },
      };
    }
  );

  // GET /super/analytics
  fastify.get(
    '/super/analytics',
    {
      schema: {
        description: 'Analytics de páginas e códigos HTML (embeds)',
        tags: ['super'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            from: { type: 'string', format: 'date' },
            to: { type: 'string', format: 'date' },
          },
        },
      },
      onRequest: [requireSuperAdmin],
    },
    async (request, reply) => {
      const { from, to } = request.query as { from?: string; to?: string };
      const where = analyticsCreatedAtWhere(from, to);

      const [
        totalEvents,
        pageViewCount,
        embedLandCount,
        sessionsGrouped,
        byPage,
        byEmbed,
        byLojaPage,
        byLojaEmbed,
      ] = await Promise.all([
        fastify.prisma.analyticsEvent.count({ where }),
        fastify.prisma.analyticsEvent.count({
          where: { ...where, kind: 'PAGE_VIEW' },
        }),
        fastify.prisma.analyticsEvent.count({
          where: { ...where, kind: 'EMBED_LAND' },
        }),
        fastify.prisma.analyticsEvent.groupBy({
          by: ['sessionId'],
          where: { ...where, sessionId: { not: null } },
          _count: { _all: true },
        }),
        fastify.prisma.analyticsEvent.groupBy({
          by: ['page'],
          where: { ...where, kind: 'PAGE_VIEW' },
          _count: { _all: true },
        }),
        fastify.prisma.analyticsEvent.groupBy({
          by: ['embedKey', 'lojaId'],
          where: { ...where, embedKey: { not: null } },
          _count: { _all: true },
        }),
        fastify.prisma.analyticsEvent.groupBy({
          by: ['lojaId', 'page'],
          where: { ...where, kind: 'PAGE_VIEW', lojaId: { not: null } },
          _count: { _all: true },
        }),
        fastify.prisma.analyticsEvent.groupBy({
          by: ['lojaId', 'embedKey'],
          where: { ...where, kind: 'EMBED_LAND', lojaId: { not: null } },
          _count: { _all: true },
        }),
      ]);

      const lojaIds = new Set<string>();
      for (const row of byLojaPage) if (row.lojaId) lojaIds.add(row.lojaId);
      for (const row of byLojaEmbed) if (row.lojaId) lojaIds.add(row.lojaId);
      for (const row of byEmbed) if (row.lojaId) lojaIds.add(row.lojaId);

      const lojas =
        lojaIds.size > 0
          ? await fastify.prisma.loja.findMany({
              where: { id: { in: [...lojaIds] } },
              select: { id: true, name: true, slug: true },
            })
          : [];
      const lojaNameMap = new Map(lojas.map((l) => [l.id, l]));

      const lojaStatsMap = new Map<
        string,
        {
          lojaId: string;
          name: string;
          slug: string;
          pageViews: number;
          embedLands: number;
          byPage: Record<string, number>;
          byEmbed: Record<string, number>;
        }
      >();

      for (const id of lojaIds) {
        const loja = lojaNameMap.get(id);
        lojaStatsMap.set(id, {
          lojaId: id,
          name: loja?.name ?? id,
          slug: loja?.slug ?? '',
          pageViews: 0,
          embedLands: 0,
          byPage: {},
          byEmbed: {},
        });
      }

      for (const row of byLojaPage) {
        if (!row.lojaId) continue;
        const entry = lojaStatsMap.get(row.lojaId);
        if (!entry) continue;
        entry.pageViews += row._count._all;
        entry.byPage[row.page] = row._count._all;
      }

      for (const row of byLojaEmbed) {
        if (!row.lojaId || !row.embedKey) continue;
        const entry = lojaStatsMap.get(row.lojaId);
        if (!entry) continue;
        entry.embedLands += row._count._all;
        entry.byEmbed[row.embedKey] = (entry.byEmbed[row.embedKey] || 0) + row._count._all;
      }

      const embedBreakdown = byEmbed
        .filter((r) => r.embedKey)
        .map((r) => {
          const loja = r.lojaId ? lojaNameMap.get(r.lojaId) : null;
          return {
            embedKey: r.embedKey!,
            lojaId: r.lojaId,
            lojaName: loja?.name ?? null,
            lojaSlug: loja?.slug ?? null,
            events: r._count._all,
          };
        })
        .sort((a, b) => b.events - a.events);

      const lojaRanking = [...lojaStatsMap.values()].sort(
        (a, b) => b.pageViews + b.embedLands - (a.pageViews + a.embedLands)
      );

      return {
        period: { from: from ?? null, to: to ?? null },
        totals: {
          events: totalEvents,
          pageViews: pageViewCount,
          embedLands: embedLandCount,
          sessions: sessionsGrouped.length,
        },
        byPage: byPage
          .map((r) => ({ page: r.page, views: r._count._all }))
          .sort((a, b) => b.views - a.views),
        embedBreakdown,
        lojaRanking,
      };
    }
  );
}

