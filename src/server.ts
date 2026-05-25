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
import { uploadsStaticPlugin } from './plugins/uploadsStaticPlugin';
import { multipartPlugin } from './plugins/multipartPlugin';
import { webDistPlugin } from './plugins/webDistPlugin';

dotenv.config();

const server = Fastify({
  loggerInstance: logger,
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
  server.log.info('Registering Prisma plugin...');
  try {
    await server.register(prismaPlugin);
    server.log.info('Prisma plugin registered');
  } catch (err) {
    server.log.error({ err }, 'Failed to register Prisma plugin, continuing without it');
    // Create a fallback Prisma instance
    const prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    (server as any).prisma = prismaInstance;
  }
  
  server.log.info('Registering plugins...');
  await server.register(uploadsStaticPlugin);
  await server.register(multipartPlugin);
  await server.register(swaggerPlugin);
  await server.register(authPlugin);
  await server.register(rateLimitPlugin);
  
  // Register tenant resolver
  server.log.info('Registering tenant resolver...');
  await server.register(tenantResolverPlugin);
  
  // Register routes
  server.log.info('Registering routes...');
  await server.register(authRoutes);
  await server.register(publicRoutes);
  await server.register(adminRoutes);
  await server.register(superRoutes);
  server.log.info('All routes registered');
  
  // Add hook directly AFTER routes to ensure it runs and has access to Prisma
  server.addHook('onRequest', async (request, reply) => {
    // Skip if already processed by plugin
    if ((request as any).tenant) {
      return;
    }
    
    // DEVELOPMENT: Allow X-Tenant-Slug header for local development without /etc/hosts
    const devTenantSlug = request.headers['x-tenant-slug'] as string | undefined;
    
    const pathOnly = request.url.split('?')[0] ?? request.url;
    if (
      devTenantSlug &&
      !request.url.startsWith('/super/') &&
      !request.url.startsWith('/auth/') &&
      !request.url.startsWith('/health') &&
      !request.url.startsWith('/docs') &&
      !pathOnly.startsWith('/uploads/')
    ) {
      try {
        // Access Prisma from server
        let prisma = server.prisma;
        
        // If still not available, create a temporary instance (fallback)
        if (!prisma) {
          prisma = new PrismaClient();
        }
        
        const loja = await prisma.loja.findUnique({
          where: { slug: devTenantSlug },
        });

        if (loja && loja.active) {
          (request as any).tenant = {
            lojaId: loja.id,
            slug: loja.slug,
            name: loja.name,
            timezone: loja.timezone,
          };
          return;
        }
      } catch (err) {
        request.log.error({ err, devTenantSlug }, 'Error resolving tenant from X-Tenant-Slug');
      }
    }
  });

  // Health check (register early, before error handler)
  // Simple health check that doesn't depend on database
  server.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Error handler
  server.setErrorHandler(errorHandler);

  // SPA (Vite build em web/dist) — último, para não sobrepor rotas da API
  await server.register(webDistPlugin);

  return server;
}

async function start() {
  try {
    logger.info('Starting server...');
    const app = await build();
    logger.info('Server built successfully');
    
    // Railway provides PORT environment variable
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    logger.info({ port, host }, 'Attempting to listen on port');
    await app.listen({ port, host });
    logger.info(`🚀 Server listening on http://${host}:${port}`);
    logger.info(`📚 Swagger docs available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    console.error('Fatal error starting server:', err);
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

