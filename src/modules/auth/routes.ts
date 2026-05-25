import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UnauthorizedError, ValidationError } from '../../lib/errors';

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /** Obrigatório para LOJA_ADMIN: tem de coincidir com a loja da conta (slug). */
  tenantSlug: z.string().min(1).optional(),
});

async function authRoutesImpl(fastify: FastifyInstance) {
  // Helper functions for hooks
  const authenticate = async (request: any, reply: any) => {
    await fastify.authenticate(request);
  };
  // POST /auth/login
  fastify.post(
    '/auth/login',
    {
      schema: {
        description: 'Login for admin users',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
            tenantSlug: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  lojaId: { type: 'string', nullable: true },
                },
              },
              loja: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
            },
          },
        },
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: 15 * 60 * 1000, // 15 minutes in milliseconds
        },
      },
    },
    async (request, reply) => {
      const { email, password, tenantSlug } = loginBodySchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { email },
        include: {
          loja: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      if (user.role === 'LOJA_ADMIN') {
        const ts = tenantSlug?.trim();
        if (!ts) {
          throw new ValidationError('Indica a loja (tenantSlug) no pedido de login.');
        }
        if (
          !user.loja ||
          user.loja.slug.toLowerCase() !== ts.toLowerCase()
        ) {
          throw new UnauthorizedError('Invalid credentials');
        }
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        lojaId: user.lojaId,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          lojaId: user.lojaId,
        },
        loja: user.loja
          ? {
              id: user.loja.id,
              name: user.loja.name,
              slug: user.loja.slug,
            }
          : null,
      };
    }
  );

  // GET /admin/me
  fastify.get(
    '/admin/me',
    {
      schema: {
        description: 'Get current admin user info',
        tags: ['auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              loja: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  slug: { type: 'string' },
                },
              },
            },
          },
        },
      },
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.user!.id },
        include: {
          loja: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        loja: user.loja
          ? {
              id: user.loja.id,
              name: user.loja.name,
              slug: user.loja.slug,
            }
          : null,
      };
    }
  );
}

export const authRoutes = fp(authRoutesImpl, {
  name: 'peaksy-auth-routes',
  dependencies: ['prisma-plugin', 'peaksy-auth'],
});

