import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { NotFoundError, ForbiddenError } from '../lib/errors';

export interface Tenant {
  lojaId: string;
  slug: string;
  name: string;
  timezone: string;
}

async function tenantResolverPluginFn(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
) {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    request.log.info(
      {
        url: request.url,
        host: request.headers.host,
        xTenantSlug: request.headers['x-tenant-slug'],
        method: request.method,
      },
      'Tenant resolver - hook started'
    );

    const host = request.headers.host || '';
    // Remove port if present
    const hostWithoutPort = host.split(':')[0];
    const pathOnly = request.url.split('?')[0] ?? request.url;

    // Ficheiros estáticos em /uploads (sem tenant)
    if (pathOnly.startsWith('/uploads/')) {
      return;
    }

    // Skip tenant resolution for super admin endpoints and auth endpoints
    if (
      request.url.startsWith('/super/') ||
      request.url.startsWith('/docs') ||
      request.url.startsWith('/auth/') ||
      request.url.startsWith('/health') ||
      pathOnly.startsWith('/public/analytics/')
    ) {
      return;
    }

    // DEVELOPMENT: Allow X-Tenant-Slug header for local development without /etc/hosts
    // Check this FIRST, before checking host
    // Fastify normalizes headers to lowercase
    const devTenantSlug = request.headers['x-tenant-slug'] as string | undefined;
    if (devTenantSlug) {
      request.log.info(
        { devTenantSlug, host: hostWithoutPort, url: request.url },
        'Processing X-Tenant-Slug header'
      );
      try {
        const loja = await fastify.prisma.loja.findUnique({
          where: { slug: devTenantSlug },
        });

        if (loja && loja.active) {
          request.tenant = {
            lojaId: loja.id,
            slug: loja.slug,
            name: loja.name,
            timezone: loja.timezone,
          };
          request.log.info({ tenant: request.tenant }, 'Tenant resolved from X-Tenant-Slug');
          return;
        } else {
          request.log.warn({ devTenantSlug, lojaFound: !!loja }, 'Loja not found or inactive');
          throw new NotFoundError(`Loja with slug '${devTenantSlug}' not found or inactive`);
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
      if (
        !request.url.startsWith('/super/') &&
        !request.url.startsWith('/auth/') &&
        !pathOnly.startsWith('/public/analytics/')
      ) {
        throw new ForbiddenError('Tenant required for this endpoint. Use X-Tenant-Slug header in development.');
      }
      return;
    }

    // Extract slug from subdomain: {slug}.<APP_DOMAIN> (ex.: lojademo.peaksy.pro)
    const appDomain = (process.env.APP_DOMAIN || 'peaksy.pro').toLowerCase();
    let slug: string | null = null;

    request.log.info({ hostWithoutPort, appDomain }, 'Extracting slug from host');

    if (hostWithoutPort.endsWith(`.${appDomain}`)) {
      slug = hostWithoutPort.slice(0, -`.${appDomain}`.length);
    } else if (hostWithoutPort.endsWith('.peaksy.local')) {
      slug = hostWithoutPort.replace('.peaksy.local', '');
    } else if (!hostWithoutPort.endsWith('.railway.app')) {
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 3) {
        const candidate = parts.slice(0, -2).join('.');
        if (candidate && !candidate.includes('.')) slug = candidate;
      }
    }

    if (!slug) {
      // Future: check custom domain
      const loja = await fastify.prisma.loja.findUnique({
        where: { domain: hostWithoutPort },
      });
      if (loja) {
        request.tenant = {
          lojaId: loja.id,
          slug: loja.slug,
          name: loja.name,
          timezone: loja.timezone,
        };
        return;
      }
    }

    if (!slug || slug.includes('.') || slug === 'www' || slug === 'super') {
      slug = null;
    }

    request.log.info({ slug, hostWithoutPort }, 'Extracted slug');

    // Host “genérico” (ex.: peaksy.up.railway.app, domínio custom sem sub-loja): não há tenant no Host.
    // O SPA na raiz e rotas /auth funcionam sem tenant; a API pública usa X-Tenant-Slug (ex.: /loja/lojademo no FE).
    if (!slug) {
      request.log.info(
        { hostWithoutPort },
        'Sem subdomínio de loja — continua sem tenant (resolve depois por header nas rotas que precisem)'
      );
      return;
    }

    // Load loja from database
    request.log.info({ slug }, 'Loading loja from database');
    const loja = await fastify.prisma.loja.findUnique({
      where: { slug },
    });

    if (!loja) {
      request.log.warn({ slug, hostWithoutPort }, 'Loja not found — SPA trata subdomínio desconhecido');
      return;
    }

    if (!loja.active) {
      request.log.warn({ slug }, 'Loja is not active — SPA trata loja inativa');
      return;
    }

    request.tenant = {
      lojaId: loja.id,
      slug: loja.slug,
      name: loja.name,
      timezone: loja.timezone,
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
      const loja = await fastify.prisma.loja.findUnique({
        where: { slug: devTenantSlug },
      });

      if (loja && loja.active) {
        request.tenant = {
          lojaId: loja.id,
          slug: loja.slug,
          name: loja.name,
          timezone: loja.timezone,
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

export const tenantResolverPlugin = fp(tenantResolverPluginFn, {
  name: 'peaksy-tenant-resolver',
  dependencies: ['prisma-plugin'],
});
