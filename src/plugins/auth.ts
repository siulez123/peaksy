import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: 'SUPER_ADMIN' | 'BAKERY_ADMIN';
      bakeryId: string | null;
    };
  }
}

export async function authPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
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
      const payload = request.user as any;
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

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireBakeryAdmin: (request: FastifyRequest) => Promise<void>;
    requireSuperAdmin: (request: FastifyRequest) => Promise<void>;
  }
}

