import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';

async function authPluginFn(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
  });

  // Decorate request with authenticate method
  fastify.decorate('authenticate', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify();
      // JWT payload from @fastify/jwt is typed as string | object | Buffer
      // We cast it to our UserPayload type after verification
      const payload = request.user as unknown as {
        id: string;
        email: string;
        role: 'SUPER_ADMIN' | 'BAKERY_ADMIN';
        bakeryId: string | null;
      };
      request.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        bakeryId: payload.bakeryId,
      };
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  // Decorate request with requireBakeryAdmin method
  fastify.decorate('requireBakeryAdmin', async function (request: FastifyRequest) {
    await fastify.authenticate(request);
    if (request.user?.role !== 'BAKERY_ADMIN') {
      throw new ForbiddenError('Bakery admin access required');
    }
    if (!request.user.bakeryId) {
      throw new ForbiddenError('Bakery admin must be associated with a bakery');
    }
  });

  // Decorate request with requireSuperAdmin method
  fastify.decorate('requireSuperAdmin', async function (request: FastifyRequest) {
    await fastify.authenticate(request);
    if (request.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Super admin access required');
    }
  });
}

/** fastify-plugin: JWT e decorators ficam no mesmo contexto que as rotas (evita fastify.jwt undefined). */
export const authPlugin = fp(authPluginFn, {
  name: 'comebolos-auth',
});

