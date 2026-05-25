import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { NotFoundError, ValidationError, ConflictError } from '../../lib/errors';

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

      const where: any = {};
      if (from || to) {
        where.createdAt = {};
        if (from) {
          where.createdAt.gte = new Date(from);
        }
        if (to) {
          where.createdAt.lte = new Date(to + 'T23:59:59');
        }
      }

      const [
        totalBakeries,
        activeBakeries,
        totalUsers,
        totalOrders,
        totalRevenue,
      ] = await Promise.all([
        fastify.prisma.loja.count(),
        fastify.prisma.loja.count({ where: { active: true } }),
        fastify.prisma.user.count(),
        fastify.prisma.order.count({ where }),
        fastify.prisma.order.aggregate({
          where: {
            ...where,
            paid: true,
          },
          _sum: {
            totalCents: true,
          },
        }),
      ]);

      return {
        lojas: {
          total: totalBakeries,
          active: activeBakeries,
        },
        users: {
          total: totalUsers,
        },
        orders: {
          total: totalOrders,
        },
        revenue: {
          totalCents: totalRevenue._sum.totalCents || 0,
        },
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

      const where: any = {
        lojaId: id,
      };

      if (from || to) {
        where.createdAt = {};
        if (from) {
          where.createdAt.gte = new Date(from);
        }
        if (to) {
          where.createdAt.lte = new Date(to + 'T23:59:59');
        }
      }

      const [totalOrders, totalRevenue, totalProducts] = await Promise.all([
        fastify.prisma.order.count({ where }),
        fastify.prisma.order.aggregate({
          where: {
            ...where,
            paid: true,
          },
          _sum: {
            totalCents: true,
          },
        }),
        fastify.prisma.product.count({
          where: { lojaId: id },
        }),
      ]);

      return {
        loja: {
          id: loja.id,
          name: loja.name,
          slug: loja.slug,
        },
        products: {
          total: totalProducts,
        },
        orders: {
          total: totalOrders,
        },
        revenue: {
          totalCents: totalRevenue._sum.totalCents || 0,
        },
      };
    }
  );
}

