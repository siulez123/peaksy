import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { errorHandler } from './lib/errors';
import { logger } from './lib/logger';
import { prismaPlugin } from './plugins/prisma';
import { PrismaClient } from '@prisma/client';
import { swaggerPlugin } from './plugins/swagger';
import { authPlugin } from './plugins/auth';
import { tenantResolverPlugin } from './plugins/tenantResolver';
import { rateLimitPlugin } from './plugins/rateLimit';
import { authRoutes } from './modules/auth/routes';
import { publicRoutes } from './modules/public/routes';
import { adminRoutes } from './modules/admin/routes';
import { superRoutes } from './modules/super/routes';

dotenv.config();

const server = Fastify({
  logger: logger,
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
});

async function build() {
  // Configure raw body for Stripe webhooks
  server.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    try {
      // Store raw body for webhook verification
      (req as any).rawBody = body;
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Register CORS
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register Prisma plugin directly
  await server.register(prismaPlugin);
  
    // Manually copy Prisma to server if not available (workaround for Fastify scoping)
    if (!server.prisma) {
      // Access Prisma from the registered plugin context
      const prismaInstance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      (server as any).prisma = prismaInstance;
    }
  await server.register(swaggerPlugin);
  await server.register(authPlugin);
  await server.register(rateLimitPlugin);
  
  // Register tenant resolver
  await server.register(tenantResolverPlugin);
  
  // Register routes
  await server.register(authRoutes);
  await server.register(publicRoutes);
  await server.register(adminRoutes);
  await server.register(superRoutes);
  
  // Add hook directly AFTER routes to ensure it runs and has access to Prisma
  server.addHook('onRequest', async (request, reply) => {
    // Skip if already processed by plugin
    if ((request as any).tenant) {
      return;
    }
    
    // DEVELOPMENT: Allow X-Tenant-Slug header for local development without /etc/hosts
    const devTenantSlug = request.headers['x-tenant-slug'] as string | undefined;
    
    if (devTenantSlug && !request.url.startsWith('/super/') && !request.url.startsWith('/auth/') && !request.url.startsWith('/health') && !request.url.startsWith('/docs')) {
      try {
        // Access Prisma from server
        let prisma = server.prisma;
        
        // If still not available, create a temporary instance (fallback)
        if (!prisma) {
          prisma = new PrismaClient();
        }
        
        const bakery = await prisma.bakery.findUnique({
          where: { slug: devTenantSlug },
        });

        if (bakery && bakery.active) {
          (request as any).tenant = {
            bakeryId: bakery.id,
            slug: bakery.slug,
            name: bakery.name,
            timezone: bakery.timezone,
          };
          return;
        }
      } catch (err) {
        request.log.error({ err, devTenantSlug }, 'Error resolving tenant from X-Tenant-Slug');
      }
    }
  });

  // Error handler
  server.setErrorHandler(errorHandler);

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });


  return server;
}

async function start() {
  try {
    const app = await build();
    // Railway provides PORT environment variable
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    app.log.info(`🚀 Server listening on http://${host}:${port}`);
    app.log.info(`📚 Swagger docs available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

start();

