import path from 'node:path';
import fs from 'node:fs/promises';
import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';

export const uploadsStaticPlugin = fp(
  async (fastify) => {
    const root = path.join(process.cwd(), 'uploads');
    await fs.mkdir(path.join(root, 'products'), { recursive: true });
    await fastify.register(fastifyStatic, {
      root,
      prefix: '/uploads/',
      decorateReply: false,
    });
  },
  { name: 'uploads-static' }
);
