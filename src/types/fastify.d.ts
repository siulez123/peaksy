import { RawBodyRequest } from '@fastify/raw-body';

declare module 'fastify' {
  interface FastifyRequest extends RawBodyRequest<FastifyRequest> {}
}

