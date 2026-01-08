import { RawBodyRequest } from '@fastify/raw-body';

export interface UserPayload {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BAKERY_ADMIN';
  bakeryId: string | null;
}

export interface TenantPayload {
  bakeryId: string;
  slug: string;
  name: string;
  timezone: string;
}

// Override @fastify/jwt types
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: UserPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest extends RawBodyRequest<FastifyRequest> {
    user?: UserPayload;
    tenant?: TenantPayload;
  }

  interface FastifyInstance {
    prisma: import('@prisma/client').PrismaClient;
    authenticate: (request: FastifyRequest) => Promise<void>;
    requireBakeryAdmin: (request: FastifyRequest) => Promise<void>;
    requireSuperAdmin: (request: FastifyRequest) => Promise<void>;
    requireTenant: (request: FastifyRequest) => Promise<void>;
  }
}

