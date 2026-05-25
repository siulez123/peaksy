import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';

export const multipartPlugin = fp(
  async (fastify) => {
    await fastify.register(multipart, {
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
      },
    });
  },
  { name: 'peaksy-multipart' }
);
