import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '../../lib/errors';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
                  bakeryId: { type: 'string', nullable: true },
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
      const { email, password } = loginSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { email },
        include: {
          bakery: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid credentials');
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        bakeryId: user.bakeryId,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          bakeryId: user.bakeryId,
        },
        bakery: user.bakery
          ? {
              id: user.bakery.id,
              name: user.bakery.name,
              slug: user.bakery.slug,
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
              bakery: {
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
          bakery: true,
        },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        bakery: user.bakery
          ? {
              id: user.bakery.id,
              name: user.bakery.name,
              slug: user.bakery.slug,
            }
          : null,
      };
    }
  );
}

export const authRoutes = fp(authRoutesImpl, {
  name: 'comebolos-auth-routes',
  dependencies: ['prisma-plugin', 'comebolos-auth'],
});

