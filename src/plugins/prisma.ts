import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';

async function prismaPluginFn(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
}

/** Usa fastify-plugin para o `prisma` ficar visível em todos os contextos (rotas são plugins irmãos). */
export const prismaPlugin = fp(prismaPluginFn, {
  name: 'prisma-plugin',
});
