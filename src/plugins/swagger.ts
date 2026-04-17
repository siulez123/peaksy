import path from 'node:path';
import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

const DOCS_PREFIX = '/docs';

async function swaggerPluginImpl(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
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
    routePrefix: DOCS_PREFIX,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'node_modules', '@fastify', 'swagger-ui', 'static'),
    prefix: `${DOCS_PREFIX}/static/`,
    decorateReply: false,
  });
}

/** fastify-plugin: mesmo contexto que a app, para `/docs/static/*` coincidir com o HTML gerado. */
export const swaggerPlugin = fp(swaggerPluginImpl, {
  name: 'comebolos-swagger',
});
