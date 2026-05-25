import { randomUUID } from 'node:crypto';
import { FastifyInstance, FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { z } from 'zod';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../lib/errors';
import {
  formatDateForDB,
  isFuturePickupCalendarDate,
  isOrderDeadlineBeforePickupCalendarDay,
} from '../../lib/dates';
import { isValidHhHalfHour, parseTimeToMinutes } from '../../lib/timeOfDay';
import {
  ensureProductUploadDir,
  saveProductImageFile,
  deleteProductImageFile,
} from '../../lib/productImage';

async function readProductMultipart(request: FastifyRequest): Promise<{
  fields: Record<string, string>;
  image?: MultipartFile;
}> {
  const fields: Record<string, string> = {};
  let image: MultipartFile | undefined;
  for await (const part of request.parts()) {
    if (part.type === 'file') {
      if (part.fieldname === 'image') {
        image = part;
      } else {
        part.file.resume();
      }
    } else {
      fields[part.fieldname] = String(part.value);
    }
  }
  return { fields, image };
}

function parseOptionalBool(s: string | undefined): boolean | undefined {
  if (s === undefined) return undefined;
  return s === 'true' || s === 'on' || s === '1';
}

const productCreateSchema = z.object({
  name: z.string().min(1).max(200),
  variant: z.string().min(1).max(100),
  priceCents: z.number().int().positive(),
  active: z.boolean().optional().default(true),
});

const productUpdateSchema = productCreateSchema.partial();

const productCapSchema = z.object({
  productId: z.string().uuid(),
  cap: z.number().int().positive(),
});

const productCapsArraySchema = z
  .array(productCapSchema)
  .refine(
    (rows) => rows.length === 0 || new Set(rows.map((r) => r.productId)).size === rows.length,
    { message: 'Cada produto só pode aparecer uma vez.' }
  );

/** Horas cheias ou meias (HH:00 ou HH:30) */
const pickupHalfHourSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|30)$/, 'Usa horas cheias ou meias (ex.: 08:00, 08:30, 19:30).');

const pickupDateRuleSchema = z.object({
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  orderDeadline: z.string().datetime(),
});

const availableDayCreateSchema = z
  .object({
    ordersOpenAt: z.string().datetime().nullable().optional(),
    pickupTimeMin: pickupHalfHourSchema,
    pickupTimeMax: pickupHalfHourSchema,
    active: z.boolean().optional().default(true),
    dayCapTotal: z.number().int().positive().optional(),
    productCaps: productCapsArraySchema.optional().default([]),
    pickupDates: z.array(pickupDateRuleSchema).min(1),
  })
  .refine(
    (d) => {
      const a = parseTimeToMinutes(d.pickupTimeMin);
      const b = parseTimeToMinutes(d.pickupTimeMax);
      return a !== null && b !== null && a <= b;
    },
    { message: 'A hora de início de levantamento tem de ser anterior ou igual à hora máxima.' }
  )
  .refine(
    (d) => new Set(d.pickupDates.map((r) => r.pickupDate)).size === d.pickupDates.length,
    { message: 'Datas de levantamento repetidas.' }
  );

const availableDayUpdateSchema = z
  .object({
    ordersOpenAt: z.string().datetime().nullable().optional(),
    pickupTimeMin: pickupHalfHourSchema.optional(),
    pickupTimeMax: pickupHalfHourSchema.optional(),
    active: z.boolean().optional(),
    dayCapTotal: z.number().int().positive().optional().nullable(),
    productCaps: productCapsArraySchema.optional(),
    pickupDates: z.array(pickupDateRuleSchema).min(1).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'Nada para atualizar.' })
  .refine(
    (d) => {
      if (d.pickupTimeMin === undefined && d.pickupTimeMax === undefined) return true;
      return d.pickupTimeMin !== undefined && d.pickupTimeMax !== undefined;
    },
    { message: 'Indica ambas as horas (início e fim) ou nenhuma.' }
  )
  .refine(
    (d) => {
      if (d.pickupTimeMin === undefined || d.pickupTimeMax === undefined) return true;
      const a = parseTimeToMinutes(d.pickupTimeMin);
      const b = parseTimeToMinutes(d.pickupTimeMax);
      return a !== null && b !== null && a <= b;
    },
    { message: 'A hora de início de levantamento tem de ser anterior ou igual à hora máxima.' }
  )
  .refine(
    (d) =>
      d.pickupDates === undefined ||
      new Set(d.pickupDates.map((r) => r.pickupDate)).size === d.pickupDates.length,
    { message: 'Datas de levantamento repetidas.' }
  );

const orderStatusUpdateSchema = z.object({
  status: z.literal('PICKED_UP'),
});

const orderItemReadySchema = z.object({
  ready: z.boolean(),
});

async function syncOrderStatusFromItemReadiness(
  prisma: FastifyInstance['prisma'],
  orderId: string
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, items: { select: { ready: true } } },
  });
  if (!order || order.status === 'PICKED_UP') return;

  const allReady =
    order.items.length > 0 && order.items.every((i) => i.ready);
  if (allReady && order.status !== 'READY') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'READY' } });
  } else if (!allReady && order.status === 'READY') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'RECEIVED' } });
  }
}

async function assertProductCapsForLoja(
  prisma: FastifyInstance['prisma'],
  lojaId: string,
  caps: Array<{ productId: string; cap: number }>
): Promise<void> {
  if (caps.length === 0) return;
  const ids = [...new Set(caps.map((c) => c.productId))];
  const found = await prisma.product.count({
    where: { lojaId, id: { in: ids }, active: true },
  });
  if (found !== ids.length) {
    throw new ValidationError('Um ou mais produtos são inválidos ou não pertencem a esta loja.');
  }
}

function validatePickupDeadlineRules(
  rules: Array<{ pickupDate: string; orderDeadline: string }>,
  timezone: string
): void {
  for (const r of rules) {
    const dl = new Date(r.orderDeadline);
    if (!isOrderDeadlineBeforePickupCalendarDay(dl, r.pickupDate, timezone)) {
      throw new ValidationError(
        `O limite de encomenda para ${r.pickupDate} tem de ser antes desse dia de levantamento.`
      );
    }
  }
}

async function assertPickupDatesNoOverlap(
  prisma: FastifyInstance['prisma'],
  lojaId: string,
  pickupDateStrs: string[],
  excludeAvailableDayId?: string
): Promise<void> {
  const unique = [...new Set(pickupDateStrs)];
  if (unique.length === 0) return;
  const asDates = unique.map((s) => new Date(`${s}T12:00:00.000Z`));
  const clashes = await prisma.availableDayPickupDate.findMany({
    where: {
      lojaId,
      pickupDate: { in: asDates },
      ...(excludeAvailableDayId ? { availableDayId: { not: excludeAvailableDayId } } : {}),
    },
    select: { pickupDate: true },
  });
  if (clashes.length > 0) {
    throw new ValidationError(
      'Uma ou mais datas de levantamento já estão em uso noutro período.'
    );
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Helper functions for hooks
  const requireLojaAdmin = async (request: any, reply: any) => {
    await fastify.requireLojaAdmin(request);
  };
  const requireTenant = async (request: any, reply: any) => {
    await fastify.requireTenant(request);
  };
  // Products CRUD
  // GET /admin/products
  fastify.get(
    '/admin/products',
    {
      schema: {
        description: 'List all products for loja',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                variant: { type: 'string' },
                priceCents: { type: 'number' },
                imageUrl: { type: 'string', nullable: true },
                active: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const products = await fastify.prisma.product.findMany({
        where: { lojaId: tenant.lojaId },
        orderBy: [{ name: 'asc' }, { variant: 'asc' }],
      });

      return products;
    }
  );

  // POST /admin/products (JSON ou multipart com campo opcional `image`)
  fastify.post(
    '/admin/products',
    {
      schema: {
        description:
          'Create a product. JSON (application/json) ou multipart/form-data com name, variant, priceCents, active e ficheiro image opcional.',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              variant: { type: 'string' },
              priceCents: { type: 'number' },
              imageUrl: { type: 'string', nullable: true },
              active: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      if (request.isMultipart()) {
        await ensureProductUploadDir();
        const { fields, image } = await readProductMultipart(request);
        const activeField = parseOptionalBool(fields.active);
        const data = productCreateSchema.parse({
          name: fields.name,
          variant: fields.variant,
          priceCents: Number(fields.priceCents),
          active: activeField ?? true,
        });
        const id = randomUUID();
        let imageUrl: string | null = null;
        if (image) {
          imageUrl = await saveProductImageFile(image, id);
        }
        const product = await fastify.prisma.product.create({
          data: {
            id,
            ...data,
            lojaId: tenant.lojaId,
            imageUrl,
          },
        });
        return reply.status(201).send(product);
      }

      const data = productCreateSchema.parse(request.body);

      const product = await fastify.prisma.product.create({
        data: {
          ...data,
          lojaId: tenant.lojaId,
        },
      });

      return reply.status(201).send(product);
    }
  );

  // GET /admin/products/:id
  fastify.get(
    '/admin/products/:id',
    {
      schema: {
        description: 'Get a product',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const product = await fastify.prisma.product.findFirst({
        where: {
          id,
          lojaId: tenant.lojaId,
        },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return product;
    }
  );

  // PATCH /admin/products/:id (JSON ou multipart com imagem opcional)
  fastify.patch(
    '/admin/products/:id',
    {
      schema: {
        description:
          'Update a product. JSON parcial ou multipart com campos a alterar e ficheiro `image` opcional.',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const existing = await fastify.prisma.product.findFirst({
        where: {
          id,
          lojaId: tenant.lojaId,
        },
      });

      if (!existing) {
        throw new NotFoundError('Product not found');
      }

      if (request.isMultipart()) {
        await ensureProductUploadDir();
        const { fields, image } = await readProductMultipart(request);
        const raw: Record<string, unknown> = {};
        if (fields.name !== undefined) raw.name = fields.name;
        if (fields.variant !== undefined) raw.variant = fields.variant;
        if (fields.priceCents !== undefined) raw.priceCents = Number(fields.priceCents);
        const ab = parseOptionalBool(fields.active);
        if (ab !== undefined) raw.active = ab;
        const data = productUpdateSchema.parse(raw);

        let imageUrl = existing.imageUrl;
        if (image) {
          await deleteProductImageFile(existing.imageUrl);
          imageUrl = await saveProductImageFile(image, id);
        }

        await fastify.prisma.product.update({
          where: { id },
          data: {
            ...data,
            ...(image ? { imageUrl } : {}),
          },
        });

        return fastify.prisma.product.findUnique({ where: { id } });
      }

      const data = productUpdateSchema.parse(request.body);

      const product = await fastify.prisma.product.updateMany({
        where: {
          id,
          lojaId: tenant.lojaId,
        },
        data,
      });

      if (product.count === 0) {
        throw new NotFoundError('Product not found');
      }

      const updated = await fastify.prisma.product.findUnique({
        where: { id },
      });

      return updated;
    }
  );

  // DELETE /admin/products/:id
  fastify.delete(
    '/admin/products/:id',
    {
      schema: {
        description: 'Delete a product',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const existing = await fastify.prisma.product.findFirst({
        where: {
          id,
          lojaId: tenant.lojaId,
        },
      });

      if (!existing) {
        throw new NotFoundError('Product not found');
      }

      await deleteProductImageFile(existing.imageUrl);

      await fastify.prisma.product.delete({
        where: { id },
      });

      return { success: true };
    }
  );

  // Available Days CRUD
  // GET /admin/available-days
  fastify.get(
    '/admin/available-days',
    {
      schema: {
        description: 'List available days',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            pickupDate: { type: 'string', format: 'date' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { pickupDate } = request.query as { pickupDate?: string };

      const where: any = {
        lojaId: tenant.lojaId,
      };

      const days = await fastify.prisma.availableDay.findMany({
        where,
        orderBy: { pickupDate: 'asc' },
        include: {
          pickupDateRules: { orderBy: { pickupDate: 'asc' } },
          productCaps: {
            include: {
              product: true,
            },
          },
          _count: { select: { orders: true } },
        },
      });

      let list = days;
      if (pickupDate) {
        list = days.filter((day) => {
          const s = formatDateForDB(day.pickupDate);
          const e = formatDateForDB(day.pickupEndDate);
          return pickupDate >= s && pickupDate <= e;
        });
      }

      return list.map((day) => ({
        ...day,
        pickupDate: formatDateForDB(day.pickupDate),
        pickupEndDate: formatDateForDB(day.pickupEndDate),
        ordersOpenAt: day.ordersOpenAt?.toISOString() ?? null,
        pickupDateRules: day.pickupDateRules.map((r) => ({
          id: r.id,
          pickupDate: formatDateForDB(r.pickupDate),
          orderDeadline: r.orderDeadline.toISOString(),
        })),
      }));
    }
  );

  // POST /admin/available-days
  fastify.post(
    '/admin/available-days',
    {
      schema: {
        description: 'Create an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['pickupTimeMin', 'pickupTimeMax', 'pickupDates'],
          properties: {
            ordersOpenAt: { type: 'string', format: 'date-time', nullable: true },
            pickupTimeMin: { type: 'string', description: 'HH:00 ou HH:30' },
            pickupTimeMax: { type: 'string', description: 'HH:00 ou HH:30' },
            active: { type: 'boolean' },
            dayCapTotal: { type: 'number', description: 'Máximo de encomendas pagas no período' },
            productCaps: { type: 'array' },
            pickupDates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  pickupDate: { type: 'string', format: 'date' },
                  orderDeadline: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const data = availableDayCreateSchema.parse(request.body);

      const sorted = [...data.pickupDates].sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
      const minPickup = sorted[0].pickupDate;
      const maxPickup = sorted[sorted.length - 1].pickupDate;

      if (!isFuturePickupCalendarDate(minPickup, tenant.timezone)) {
        throw new ValidationError('A primeira data de levantamento tem de ser posterior a hoje.');
      }

      validatePickupDeadlineRules(sorted, tenant.timezone);
      await assertPickupDatesNoOverlap(
        fastify.prisma,
        tenant.lojaId,
        sorted.map((r) => r.pickupDate)
      );
      await assertProductCapsForLoja(fastify.prisma, tenant.lojaId, data.productCaps);

      const day = await fastify.prisma.$transaction(async (tx) => {
        const created = await tx.availableDay.create({
          data: {
            lojaId: tenant.lojaId,
            pickupDate: new Date(`${minPickup}T12:00:00.000Z`),
            pickupEndDate: new Date(`${maxPickup}T12:00:00.000Z`),
            ordersOpenAt:
              data.ordersOpenAt !== undefined && data.ordersOpenAt !== null
                ? new Date(data.ordersOpenAt)
                : null,
            pickupTimeMin: data.pickupTimeMin,
            pickupTimeMax: data.pickupTimeMax,
            active: data.active ?? true,
            dayCapTotal: data.dayCapTotal,
          },
        });
        for (const r of sorted) {
          await tx.availableDayPickupDate.create({
            data: {
              id: randomUUID(),
              lojaId: tenant.lojaId,
              availableDayId: created.id,
              pickupDate: new Date(`${r.pickupDate}T12:00:00.000Z`),
              orderDeadline: new Date(r.orderDeadline),
            },
          });
        }
        if (data.productCaps.length > 0) {
          await tx.availableDayProductCap.createMany({
            data: data.productCaps.map((pc) => ({
              lojaId: tenant.lojaId,
              availableDayId: created.id,
              productId: pc.productId,
              cap: pc.cap,
            })),
          });
        }
        return created;
      });

      const full = await fastify.prisma.availableDay.findUniqueOrThrow({
        where: { id: day.id },
        include: {
          pickupDateRules: { orderBy: { pickupDate: 'asc' } },
          productCaps: { include: { product: true } },
          _count: { select: { orders: true } },
        },
      });

      return reply.status(201).send({
        ...full,
        pickupDate: formatDateForDB(full.pickupDate),
        pickupEndDate: formatDateForDB(full.pickupEndDate),
        ordersOpenAt: full.ordersOpenAt?.toISOString() ?? null,
        pickupDateRules: full.pickupDateRules.map((r) => ({
          id: r.id,
          pickupDate: formatDateForDB(r.pickupDate),
          orderDeadline: r.orderDeadline.toISOString(),
        })),
      });
    }
  );

  // PATCH /admin/available-days/:id
  fastify.patch(
    '/admin/available-days/:id',
    {
      schema: {
        description: 'Update an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };
      const data = availableDayUpdateSchema.parse(request.body);

      const existing = await fastify.prisma.availableDay.findFirst({
        where: {
          id,
          lojaId: tenant.lojaId,
        },
      });

      if (!existing) {
        throw new NotFoundError('Available day not found');
      }

      if (data.pickupDates) {
        const sorted = [...data.pickupDates].sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
        validatePickupDeadlineRules(sorted, tenant.timezone);
        await assertPickupDatesNoOverlap(
          fastify.prisma,
          tenant.lojaId,
          sorted.map((r) => r.pickupDate),
          id
        );
      }

      if (data.productCaps !== undefined) {
        await assertProductCapsForLoja(fastify.prisma, tenant.lojaId, data.productCaps);
      }

      const updateData: Record<string, unknown> = {};
      if (data.ordersOpenAt !== undefined) {
        updateData.ordersOpenAt =
          data.ordersOpenAt === null ? null : new Date(data.ordersOpenAt as string);
      }
      if (data.active !== undefined) updateData.active = data.active;
      if (data.dayCapTotal !== undefined) updateData.dayCapTotal = data.dayCapTotal;
      if (data.pickupTimeMin !== undefined) updateData.pickupTimeMin = data.pickupTimeMin;
      if (data.pickupTimeMax !== undefined) updateData.pickupTimeMax = data.pickupTimeMax;

      if (data.pickupDates) {
        const sorted = [...data.pickupDates].sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
        const minPickup = sorted[0].pickupDate;
        const maxPickup = sorted[sorted.length - 1].pickupDate;
        updateData.pickupDate = new Date(`${minPickup}T12:00:00.000Z`);
        updateData.pickupEndDate = new Date(`${maxPickup}T12:00:00.000Z`);
      }

      const hasDayUpdates = Object.keys(updateData).length > 0;

      await fastify.prisma.$transaction(async (tx) => {
        if (hasDayUpdates) {
          await tx.availableDay.update({
            where: { id },
            data: updateData as any,
          });
        }
        if (data.pickupDates) {
          await tx.availableDayPickupDate.deleteMany({ where: { availableDayId: id } });
          for (const r of data.pickupDates.sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))) {
            await tx.availableDayPickupDate.create({
              data: {
                id: randomUUID(),
                lojaId: tenant.lojaId,
                availableDayId: id,
                pickupDate: new Date(`${r.pickupDate}T12:00:00.000Z`),
                orderDeadline: new Date(r.orderDeadline),
              },
            });
          }
        }
        if (data.productCaps !== undefined) {
          await tx.availableDayProductCap.deleteMany({ where: { availableDayId: id } });
          if (data.productCaps.length > 0) {
            await tx.availableDayProductCap.createMany({
              data: data.productCaps.map((pc) => ({
                lojaId: tenant.lojaId,
                availableDayId: id,
                productId: pc.productId,
                cap: pc.cap,
              })),
            });
          }
        }
      });

      const updated = await fastify.prisma.availableDay.findUniqueOrThrow({
        where: { id },
        include: {
          pickupDateRules: { orderBy: { pickupDate: 'asc' } },
          productCaps: { include: { product: true } },
          _count: { select: { orders: true } },
        },
      });

      return {
        ...updated,
        pickupDate: formatDateForDB(updated.pickupDate),
        pickupEndDate: formatDateForDB(updated.pickupEndDate),
        ordersOpenAt: updated.ordersOpenAt?.toISOString() ?? null,
        pickupDateRules: updated.pickupDateRules.map((r) => ({
          id: r.id,
          pickupDate: formatDateForDB(r.pickupDate),
          orderDeadline: r.orderDeadline.toISOString(),
        })),
      };
    }
  );

  // DELETE /admin/available-days/:id
  fastify.delete(
    '/admin/available-days/:id',
    {
      schema: {
        description: 'Delete an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const existingDay = await fastify.prisma.availableDay.findFirst({
        where: {
          id,
          lojaId: tenant.lojaId,
        },
      });

      if (!existingDay) {
        throw new NotFoundError('Available day not found');
      }

      const orderCount = await fastify.prisma.order.count({
        where: { availableDayId: id },
      });

      if (orderCount > 0) {
        throw new ConflictError('Não é possível apagar: existem pedidos associados a este período.');
      }

      await fastify.prisma.availableDay.delete({
        where: { id },
      });

      return { success: true };
    }
  );

  // Product Caps
  // GET /admin/available-days/:id/product-caps
  fastify.get(
    '/admin/available-days/:id/product-caps',
    {
      schema: {
        description: 'Get product caps for an available day',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };

      const day = await fastify.prisma.availableDay.findFirst({
        where: {
          id,
          lojaId: tenant.lojaId,
        },
      });

      if (!day) {
        throw new NotFoundError('Available day not found');
      }

      const caps = await fastify.prisma.availableDayProductCap.findMany({
        where: {
          availableDayId: id,
          lojaId: tenant.lojaId,
        },
        include: {
          product: true,
        },
      });

      return caps;
    }
  );

  // POST /admin/available-days/:id/product-caps
  fastify.post(
    '/admin/available-days/:id/product-caps',
    {
      schema: {
        description: 'Create or update product cap',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['productId', 'cap'],
          properties: {
            productId: { type: 'string' },
            cap: { type: 'number' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };
      const data = productCapSchema.parse(request.body);

      // Verify day and product belong to loja
      const [day, product] = await Promise.all([
        fastify.prisma.availableDay.findFirst({
          where: { id, lojaId: tenant.lojaId },
        }),
        fastify.prisma.product.findFirst({
          where: { id: data.productId, lojaId: tenant.lojaId },
        }),
      ]);

      if (!day) {
        throw new NotFoundError('Available day not found');
      }
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const cap = await fastify.prisma.availableDayProductCap.upsert({
        where: {
          availableDayId_productId: {
            availableDayId: id,
            productId: data.productId,
          },
        },
        update: { cap: data.cap },
        create: {
          lojaId: tenant.lojaId,
          availableDayId: id,
          productId: data.productId,
          cap: data.cap,
        },
      });

      return reply.status(201).send(cap);
    }
  );

  // DELETE /admin/available-days/:id/product-caps/:productId
  fastify.delete(
    '/admin/available-days/:id/product-caps/:productId',
    {
      schema: {
        description: 'Delete product cap',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            productId: { type: 'string' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id, productId } = request.params as {
        id: string;
        productId: string;
      };

      const cap = await fastify.prisma.availableDayProductCap.deleteMany({
        where: {
          availableDayId: id,
          productId,
          lojaId: tenant.lojaId,
        },
      });

      if (cap.count === 0) {
        throw new NotFoundError('Product cap not found');
      }

      return { success: true };
    }
  );

  // Orders
  // GET /admin/orders
  fastify.get(
    '/admin/orders',
    {
      schema: {
        description: 'List orders',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            pickupDate: { type: 'string', format: 'date' },
            pickupTime: { type: 'string', description: 'HH:00 ou HH:30' },
            status: { type: 'string', enum: ['RECEIVED', 'READY', 'PICKED_UP'] },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            product: { type: 'string', description: 'Pesquisa em nome/variante dos artigos' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const q = request.query as {
        pickupDate?: string;
        pickupTime?: string;
        status?: string;
        customerName?: string;
        customerPhone?: string;
        product?: string;
      };

      const where: Record<string, unknown> = {
        lojaId: tenant.lojaId,
      };

      if (q.pickupDate) {
        where.pickupDate = new Date(q.pickupDate);
      }

      if (q.status) {
        where.status = q.status;
      }

      const pt = q.pickupTime?.trim();
      if (pt) {
        if (!isValidHhHalfHour(pt)) {
          throw new ValidationError('pickupTime inválido (usa HH:00 ou HH:30).');
        }
        where.pickupTime = pt;
      }

      const nameQ = q.customerName?.trim().slice(0, 120);
      if (nameQ) {
        where.customerName = { contains: nameQ, mode: 'insensitive' };
      }

      const phoneQ = q.customerPhone?.trim().slice(0, 40);
      if (phoneQ) {
        where.customerPhone = { contains: phoneQ, mode: 'insensitive' };
      }

      const productQ = q.product?.trim().slice(0, 80);
      if (productQ) {
        where.items = {
          some: {
            OR: [
              { productNameSnapshot: { contains: productQ, mode: 'insensitive' } },
              { variantSnapshot: { contains: productQ, mode: 'insensitive' } },
            ],
          },
        };
      }

      const orders = await fastify.prisma.order.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return orders.map((order) => ({
        ...order,
        pickupDate: formatDateForDB(order.pickupDate),
      }));
    }
  );

  // PATCH /admin/orders/:orderId/items/:itemId — marcar artigo pronto / não pronto
  fastify.patch(
    '/admin/orders/:orderId/items/:itemId',
    {
      schema: {
        description: 'Marcar linha de artigo como pronta ou não (a encomenda fica Pronta quando todos os artigos estão prontos)',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            orderId: { type: 'string' },
            itemId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['ready'],
          properties: {
            ready: { type: 'boolean' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { orderId, itemId } = request.params as { orderId: string; itemId: string };
      const { ready } = orderItemReadySchema.parse(request.body);

      const existing = await fastify.prisma.order.findFirst({
        where: { id: orderId, lojaId: tenant.lojaId },
        select: { status: true },
      });
      if (!existing) {
        throw new NotFoundError('Order not found');
      }
      if (existing.status === 'PICKED_UP') {
        throw new ValidationError('Não é possível alterar artigos de uma encomenda já levantada.');
      }

      const updatedItem = await fastify.prisma.orderItem.updateMany({
        where: { id: itemId, orderId },
        data: { ready },
      });
      if (updatedItem.count === 0) {
        throw new NotFoundError('Artigo não encontrado nesta encomenda');
      }

      await syncOrderStatusFromItemReadiness(fastify.prisma, orderId);

      const updated = await fastify.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      return {
        ...updated,
        pickupDate: formatDateForDB(updated!.pickupDate),
      };
    }
  );

  // PATCH /admin/orders/:id/status — apenas "Levantado" quando a encomenda já está Pronta
  fastify.patch(
    '/admin/orders/:id/status',
    {
      schema: {
        description: 'Marcar encomenda como levantada (só quando já está Pronta)',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['PICKED_UP'] },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { id } = request.params as { id: string };
      orderStatusUpdateSchema.parse(request.body);

      const current = await fastify.prisma.order.findFirst({
        where: { id, lojaId: tenant.lojaId },
        select: { status: true },
      });
      if (!current) {
        throw new NotFoundError('Order not found');
      }
      if (current.status !== 'READY') {
        throw new ValidationError(
          'Só podes marcar como levantada uma encomenda que já está pronta (todos os artigos prontos).'
        );
      }

      await fastify.prisma.order.update({
        where: { id },
        data: { status: 'PICKED_UP' },
      });

      const updated = await fastify.prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      return {
        ...updated,
        pickupDate: formatDateForDB(updated!.pickupDate),
      };
    }
  );

  // GET /admin/orders/summary
  fastify.get(
    '/admin/orders/summary',
    {
      schema: {
        description: 'Get order summary for production',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            pickupDate: { type: 'string', format: 'date' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const { pickupDate } = request.query as { pickupDate?: string };

      if (!pickupDate) {
        throw new ValidationError('pickupDate is required');
      }

      const orders = await fastify.prisma.order.findMany({
        where: {
          lojaId: tenant.lojaId,
          pickupDate: new Date(pickupDate),
          paid: true,
        },
        include: {
          items: true,
        },
      });

      // Aggregate by product
      const productTotals: Record<
        string,
        {
          productName: string;
          variant: string;
          totalQuantity: number;
        }
      > = {};

      for (const order of orders) {
        for (const item of order.items) {
          const key = `${item.productNameSnapshot}_${item.variantSnapshot}`;
          if (!productTotals[key]) {
            productTotals[key] = {
              productName: item.productNameSnapshot,
              variant: item.variantSnapshot,
              totalQuantity: 0,
            };
          }
          productTotals[key].totalQuantity += item.quantity;
        }
      }

      const statusCounts = {
        RECEIVED: orders.filter((o) => o.status === 'RECEIVED').length,
        READY: orders.filter((o) => o.status === 'READY').length,
        PICKED_UP: orders.filter((o) => o.status === 'PICKED_UP').length,
      };

      return {
        pickupDate,
        productTotals: Object.values(productTotals),
        statusCounts,
        totalOrders: orders.length,
      };
    }
  );

  // GET /admin/orders/production-breakdown — totais por dia, hora e produto (encomendas pagas)
  fastify.get(
    '/admin/orders/production-breakdown',
    {
      schema: {
        description: 'Production breakdown by pickup date, time and product line',
        tags: ['admin'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['pickupDate'],
          properties: {
            pickupDate: { type: 'string', format: 'date' },
            pickupDateTo: { type: 'string', format: 'date' },
            pickupTime: { type: 'string', description: 'HH:00 ou HH:30' },
            productIds: { type: 'string', description: 'UUIDs separados por vírgula' },
          },
        },
      },
      onRequest: [requireLojaAdmin, requireTenant],
    },
    async (request, reply) => {
      const tenant = request.tenant!;
      const user = request.user!;

      if (user.lojaId !== tenant.lojaId) {
        throw new ForbiddenError('Access denied');
      }

      const q = request.query as {
        pickupDate: string;
        pickupDateTo?: string;
        pickupTime?: string;
        productIds?: string;
      };

      const fromStr = q.pickupDate.trim();
      const toStr = (q.pickupDateTo?.trim() || fromStr).trim();
      const from = new Date(fromStr);
      const to = new Date(toStr);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new ValidationError('Datas inválidas.');
      }
      if (to < from) {
        throw new ValidationError('A data final não pode ser anterior à inicial.');
      }
      const daySpan = Math.ceil((to.getTime() - from.getTime()) / 86400000);
      if (daySpan > 31) {
        throw new ValidationError('Intervalo máximo: 31 dias.');
      }

      const pt = q.pickupTime?.trim();
      if (pt && !isValidHhHalfHour(pt)) {
        throw new ValidationError('pickupTime inválido (usa HH:00 ou HH:30).');
      }

      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const productIds = (q.productIds?.trim() || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const id of productIds) {
        if (!uuidRe.test(id)) {
          throw new ValidationError('productIds contém identificadores inválidos.');
        }
      }

      const where: Record<string, unknown> = {
        lojaId: tenant.lojaId,
        paid: true,
        pickupDate: {
          gte: from,
          lte: to,
        },
      };

      if (pt) {
        where.pickupTime = pt;
      }

      if (productIds.length > 0) {
        where.items = {
          some: {
            productId: { in: productIds },
          },
        };
      }

      const orders = await fastify.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: [{ pickupDate: 'asc' }, { pickupTime: 'asc' }, { createdAt: 'asc' }],
      });

      type Row = {
        pickupDate: string;
        pickupTime: string;
        productName: string;
        variant: string;
        totalQuantity: number;
      };

      const map = new Map<string, Row>();

      const idSet = productIds.length > 0 ? new Set(productIds) : null;

      for (const order of orders) {
        const d = formatDateForDB(order.pickupDate);
        const time = order.pickupTime;
        for (const item of order.items) {
          if (idSet && !idSet.has(item.productId)) {
            continue;
          }
          const key = `${d}|${time}|${item.productNameSnapshot}\0${item.variantSnapshot}`;
          const cur = map.get(key);
          if (!cur) {
            map.set(key, {
              pickupDate: d,
              pickupTime: time,
              productName: item.productNameSnapshot,
              variant: item.variantSnapshot,
              totalQuantity: item.quantity,
            });
          } else {
            cur.totalQuantity += item.quantity;
          }
        }
      }

      const rows = Array.from(map.values()).sort((a, b) => {
        const c = a.pickupDate.localeCompare(b.pickupDate);
        if (c !== 0) return c;
        const t = a.pickupTime.localeCompare(b.pickupTime);
        if (t !== 0) return t;
        return `${a.productName} ${a.variant}`.localeCompare(`${b.productName} ${b.variant}`, 'pt');
      });

      const byProduct = new Map<string, { productName: string; variant: string; totalQuantity: number }>();
      for (const r of rows) {
        const k = `${r.productName}\0${r.variant}`;
        const x = byProduct.get(k);
        if (!x) {
          byProduct.set(k, {
            productName: r.productName,
            variant: r.variant,
            totalQuantity: r.totalQuantity,
          });
        } else {
          x.totalQuantity += r.totalQuantity;
        }
      }

      const productTotals = Array.from(byProduct.values()).sort((a, b) =>
        `${a.productName} ${a.variant}`.localeCompare(`${b.productName} ${b.variant}`, 'pt')
      );

      const statusCounts = {
        RECEIVED: orders.filter((o) => o.status === 'RECEIVED').length,
        READY: orders.filter((o) => o.status === 'READY').length,
        PICKED_UP: orders.filter((o) => o.status === 'PICKED_UP').length,
      };

      return {
        pickupDate: fromStr,
        pickupDateTo: toStr === fromStr ? null : toStr,
        totalOrders: orders.length,
        rows,
        productTotals,
        statusCounts,
      };
    }
  );
}

