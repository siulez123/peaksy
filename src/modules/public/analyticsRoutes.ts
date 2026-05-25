import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AnalyticsEventKind } from '@prisma/client';
import { ValidationError } from '../../lib/errors';
import {
  normalizeAnalyticsPage,
  normalizeEmbedKey,
  normalizeEventKind,
  truncateField,
} from '../../lib/analytics';

const eventSchema = z.object({
  kind: z.enum(['PAGE_VIEW', 'EMBED_LAND']),
  page: z.string().min(1).max(40),
  path: z.string().min(1).max(500),
  lojaSlug: z.string().max(100).optional(),
  embedKey: z.string().max(32).optional(),
  referrer: z.string().max(500).optional(),
  sessionId: z.string().max(64).optional(),
});

const collectSchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
});

export async function publicAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/public/analytics/events',
    {
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
      schema: {
        description: 'Registar eventos de analytics (page views, embeds)',
        tags: ['public'],
        body: {
          type: 'object',
          required: ['events'],
          properties: {
            events: {
              type: 'array',
              maxItems: 20,
              items: {
                type: 'object',
                required: ['kind', 'page', 'path'],
                properties: {
                  kind: { type: 'string', enum: ['PAGE_VIEW', 'EMBED_LAND'] },
                  page: { type: 'string' },
                  path: { type: 'string' },
                  lojaSlug: { type: 'string' },
                  embedKey: { type: 'string' },
                  referrer: { type: 'string' },
                  sessionId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = collectSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.errors.map((e) => e.message).join('; '));
      }

      const slugToId = new Map<string, string>();
      const rows: Array<{
        kind: AnalyticsEventKind;
        page: ReturnType<typeof normalizeAnalyticsPage>;
        path: string;
        lojaId: string | null;
        embedKey: string | null;
        referrer: string | null;
        sessionId: string | null;
      }> = [];

      for (const ev of parsed.data.events) {
        const page = normalizeAnalyticsPage(ev.page);
        const kind = normalizeEventKind(ev.kind);
        if (!page || !kind) continue;

        const path = truncateField(ev.path, 500);
        if (!path) continue;

        let lojaId: string | null = request.tenant?.lojaId ?? null;
        const slug = ev.lojaSlug?.trim().toLowerCase();
        if (slug) {
          let id = slugToId.get(slug);
          if (!id) {
            const loja = await fastify.prisma.loja.findUnique({
              where: { slug },
              select: { id: true, active: true },
            });
            if (loja?.active) {
              id = loja.id;
              slugToId.set(slug, id);
            }
          }
          if (id) lojaId = id;
        }

        const embedKey = normalizeEmbedKey(ev.embedKey);
        rows.push({
          kind,
          page,
          path,
          lojaId,
          embedKey,
          referrer: truncateField(ev.referrer, 500),
          sessionId: truncateField(ev.sessionId, 64),
        });
      }

      if (rows.length === 0) {
        return { accepted: 0 };
      }

      await fastify.prisma.analyticsEvent.createMany({
        data: rows.map((r) => ({
          kind: r.kind,
          page: r.page!,
          path: r.path,
          lojaId: r.lojaId,
          embedKey: r.embedKey,
          referrer: r.referrer,
          sessionId: r.sessionId,
        })),
      });

      return { accepted: rows.length };
    }
  );
}
