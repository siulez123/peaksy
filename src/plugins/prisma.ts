import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export async function prismaPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Decorate the fastify instance with Prisma
  fastify.decorate('prisma', prisma);
  
  // Also ensure it's available on the parent if this is a scoped plugin
  if ((fastify as any).parent) {
    (fastify as any).parent.decorate('prisma', prisma);
  }

  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
}

