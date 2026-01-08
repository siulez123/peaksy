import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export async function rateLimitPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  await fastify.register(rateLimit, {
    global: false, // Apply per route
  });
}

