import path from 'node:path';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';

/**
 * Caminhos cuja API pode responder 404 em JSON (rotas só-backend).
 * `/admin/*` e `/super/*` incluem rotas do SPA (ex. `/super/entrar`) — não listar aqui;
 * pedidos GET não registados nesses prefixos devem receber index.html.
 */
function isApiPath(pathOnly: string): boolean {
  const seg = pathOnly.split('/').filter(Boolean)[0];
  if (!seg) return false;
  return ['auth', 'public', 'uploads', 'docs', 'health'].includes(seg);
}

/**
 * Serve `web/dist` (build Vite) e fallback SPA para GET fora da API.
 * Em desenvolvimento local normalmente não existe `web/dist` — só API.
 */
export const webDistPlugin = fp(
  async (fastify) => {
    const root = process.env.WEB_DIST_PATH || path.join(process.cwd(), 'web/dist');
    const indexPath = path.join(root, 'index.html');
    if (!fs.existsSync(indexPath)) {
      fastify.log.info({ root }, 'web/dist não encontrado — apenas API');
      return;
    }

    await fastify.register(fastifyStatic, {
      root,
      prefix: '/',
      decorateReply: false,
    });

    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return reply.status(404).send({ statusCode: 404, message: 'Not Found' });
      }
      const pathOnly = (request.raw.url ?? '').split('?')[0] ?? '';
      if (isApiPath(pathOnly)) {
        return reply.status(404).send({ statusCode: 404, message: 'Not Found' });
      }
      const html = await readFile(indexPath, 'utf-8');
      return reply.type('text/html').send(html);
    });
  },
  { name: 'web-dist-spa', encapsulate: false }
);
