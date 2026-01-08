import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export interface Tenant {
  bakeryId: string;
  slug: string;
  name: string;
  timezone: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: Tenant;
  }
}

export async function tenantResolverPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    request.log.info({ 
      url: request.url,
      host: request.headers.host,
      xTenantSlug: request.headers['x-tenant-slug'],
      method: request.method
    }, 'Tenant resolver - hook started');
    
    const host = request.headers.host || '';
    // Remove port if present
    const hostWithoutPort = host.split(':')[0];

    // Skip tenant resolution for super admin endpoints and auth endpoints
    if (
      request.url.startsWith('/super/') ||
      request.url.startsWith('/docs') ||
      request.url.startsWith('/auth/') ||
      request.url.startsWith('/health')
    ) {
      return;
    }

    // DEVELOPMENT: Allow X-Tenant-Slug header for local development without /etc/hosts
    // Check this FIRST, before checking host
    // Fastify normalizes headers to lowercase
    const devTenantSlug = request.headers['x-tenant-slug'] as string | undefined;
    if (devTenantSlug) {
      request.log.info({ devTenantSlug, host: hostWithoutPort, url: request.url }, 'Processing X-Tenant-Slug header');
      try {
        const bakery = await fastify.prisma.bakery.findUnique({
          where: { slug: devTenantSlug },
        });

        if (bakery && bakery.active) {
          request.tenant = {
            bakeryId: bakery.id,
            slug: bakery.slug,
            name: bakery.name,
            timezone: bakery.timezone,
          };
          request.log.info({ tenant: request.tenant }, 'Tenant resolved from X-Tenant-Slug');
          return;
        } else {
          request.log.warn({ devTenantSlug, bakeryFound: !!bakery }, 'Bakery not found or inactive');
          throw new NotFoundError(`Bakery with slug '${devTenantSlug}' not found or inactive`);
        }
      } catch (err: any) {
        if (err instanceof NotFoundError) {
          throw err;
        }
        request.log.error({ err, devTenantSlug }, 'Error resolving tenant from X-Tenant-Slug');
        throw new NotFoundError('Error resolving tenant');
      }
    }

    // Handle slicesofbravery.pt or localhost without tenant
    // Only block if X-Tenant-Slug was not provided
    if (
      !devTenantSlug &&
      (hostWithoutPort === 'slicesofbravery.pt' ||
        hostWithoutPort === 'localhost' ||
        hostWithoutPort === '127.0.0.1')
    ) {
      // Only allow super admin endpoints
      if (!request.url.startsWith('/super/') && !request.url.startsWith('/auth/')) {
        throw new ForbiddenError('Tenant required for this endpoint. Use X-Tenant-Slug header in development.');
      }
      return;
    }

    // Extract slug from subdomain pattern: {slug}.comebolos.com or {slug}.comebolos.local
    let slug: string | null = null;

    request.log.info({ hostWithoutPort }, 'Extracting slug from host');

    if (hostWithoutPort.endsWith('.comebolos.com')) {
      slug = hostWithoutPort.replace('.comebolos.com', '');
    } else if (hostWithoutPort.endsWith('.comebolos.local')) {
      slug = hostWithoutPort.replace('.comebolos.local', '');
    } else {
      // Future: check custom domain
      const bakery = await fastify.prisma.bakery.findUnique({
        where: { domain: hostWithoutPort },
      });
      if (bakery) {
        request.tenant = {
          bakeryId: bakery.id,
          slug: bakery.slug,
          name: bakery.name,
          timezone: bakery.timezone,
        };
        return;
      }
    }

    request.log.info({ slug, hostWithoutPort }, 'Extracted slug');

    if (!slug) {
      request.log.warn({ hostWithoutPort }, 'No slug extracted, throwing error');
      throw new NotFoundError('Bakery not found');
    }

    // Load bakery from database
    request.log.info({ slug }, 'Loading bakery from database');
    const bakery = await fastify.prisma.bakery.findUnique({
      where: { slug },
    });

    if (!bakery) {
      request.log.warn({ slug }, 'Bakery not found in database');
      throw new NotFoundError('Bakery not found');
    }

    if (!bakery.active) {
      throw new ForbiddenError('Bakery is not active');
    }

    request.tenant = {
      bakeryId: bakery.id,
      slug: bakery.slug,
      name: bakery.name,
      timezone: bakery.timezone,
    };
    request.log.info({ tenant: request.tenant }, 'Tenant resolved successfully');
  });

  // Helper to require tenant
  fastify.decorate('requireTenant', async function (request: FastifyRequest) {
    // If tenant already resolved, return
    if (request.tenant) {
      return;
    }

    // Try to resolve from X-Tenant-Slug header if not already resolved
    const devTenantSlug = request.headers['x-tenant-slug'] as string | undefined;
    if (devTenantSlug) {
      request.log.info({ devTenantSlug }, 'Resolving tenant from X-Tenant-Slug in requireTenant');
      const bakery = await fastify.prisma.bakery.findUnique({
        where: { slug: devTenantSlug },
      });

      if (bakery && bakery.active) {
        request.tenant = {
          bakeryId: bakery.id,
          slug: bakery.slug,
          name: bakery.name,
          timezone: bakery.timezone,
        };
        request.log.info({ tenant: request.tenant }, 'Tenant resolved from X-Tenant-Slug in requireTenant');
        return;
      }
    }

    // If still no tenant, throw error
    if (!request.tenant) {
      throw new NotFoundError('Tenant not found. Use X-Tenant-Slug header or correct Host header.');
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    requireTenant: (request: FastifyRequest) => Promise<void>;
  }
}

