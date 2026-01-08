import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export async function swaggerPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Comebolos API',
        description: 'Multi-tenant bakery pre-order SaaS API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
}

