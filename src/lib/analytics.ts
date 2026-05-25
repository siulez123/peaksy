import { AnalyticsEventKind, AnalyticsPage, Prisma } from '@prisma/client';

export const ANALYTICS_EMBED_KEYS = ['link', 'button', 'iframe'] as const;
export type AnalyticsEmbedKey = (typeof ANALYTICS_EMBED_KEYS)[number];

export function analyticsCreatedAtWhere(from?: string, to?: string): Prisma.AnalyticsEventWhereInput {
  const where: Prisma.AnalyticsEventWhereInput = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
  }
  return where;
}

export function normalizeEmbedKey(raw: unknown): AnalyticsEmbedKey | null {
  if (typeof raw !== 'string') return null;
  const k = raw.trim().toLowerCase();
  return (ANALYTICS_EMBED_KEYS as readonly string[]).includes(k) ? (k as AnalyticsEmbedKey) : null;
}

export function normalizeAnalyticsPage(raw: unknown): AnalyticsPage | null {
  if (typeof raw !== 'string') return null;
  const p = raw.trim().toUpperCase();
  return (Object.values(AnalyticsPage) as string[]).includes(p) ? (p as AnalyticsPage) : null;
}

export function normalizeEventKind(raw: unknown): AnalyticsEventKind | null {
  if (typeof raw !== 'string') return null;
  const k = raw.trim().toUpperCase();
  return k === 'PAGE_VIEW' || k === 'EMBED_LAND' ? (k as AnalyticsEventKind) : null;
}

export function truncateField(value: unknown, max: number): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}
