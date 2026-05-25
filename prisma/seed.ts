import { randomUUID } from 'node:crypto';
import { PrismaClient, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_SLUGS = ['lojademo', 'flordeesmoriz'] as const;

/** Amanhã e depois de amanhã a partir de hoje (hora local). */
function pickupDates(): { d1: Date; d2: Date } {
  const t = new Date();
  const y = t.getFullYear();
  const m = t.getMonth();
  const d = t.getDate();
  const d1 = new Date(y, m, d + 1, 12, 0, 0, 0);
  const d2 = new Date(y, m, d + 2, 12, 0, 0, 0);
  return { d1, d2 };
}

async function main() {
  console.log('🌱 Starting seed...');

  const superAdminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@peaksy.local' },
    update: {},
    create: {
      email: 'super@peaksy.local',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      lojaId: null,
    },
  });
  console.log('✅ Super admin:', superAdmin.email);

  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

  const { d1, d2 } = pickupDates();
  const orderDeadlineFar = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

  // Limpar dados de demo para recriar encomendas e dias
  const demoLojas = await prisma.loja.findMany({
    where: { slug: { in: [...DEMO_SLUGS] } },
    select: { id: true, slug: true },
  });
  for (const b of demoLojas) {
    await prisma.order.deleteMany({ where: { lojaId: b.id } });
    await prisma.availableDayProductCap.deleteMany({ where: { lojaId: b.id } });
    await prisma.availableDay.deleteMany({ where: { lojaId: b.id } });
    await prisma.product.deleteMany({ where: { lojaId: b.id } });
  }

  const img = {
    boloRei: '/uploads/seed/bolo-rei.jpg',
    paoLo: '/uploads/seed/pao-de-lo.jpg',
    paoLoPapel: '/uploads/seed/pao-de-lo-papel.jpg',
    jamon: '/uploads/seed/pao-de-jamon.jpg',
  };

  // —— Loja Demo ——
  const lojademo = await prisma.loja.upsert({
    where: { slug: 'lojademo' },
    update: {
      name: 'Loja Demo',
      active: true,
      addressLine: 'Rua da Loja Demo, 123',
      postalCode: '1000-001',
      locality: 'Lisboa',
      phone: '+351211000000',
    },
    create: {
      name: 'Loja Demo',
      slug: 'lojademo',
      timezone: 'Europe/Lisbon',
      active: true,
      plan: 'STARTER',
      addressLine: 'Rua da Loja Demo, 123',
      postalCode: '1000-001',
      locality: 'Lisboa',
      phone: '+351211000000',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@lojademo.local' },
    update: { passwordHash: adminPasswordHash, lojaId: lojademo.id },
    create: {
      email: 'admin@lojademo.local',
      passwordHash: adminPasswordHash,
      role: 'LOJA_ADMIN',
      lojaId: lojademo.id,
    },
  });

  const productsDemo = [
    { name: 'Bolo Rei', variant: '750g', priceCents: 1200, imageUrl: img.boloRei },
    { name: 'Bolo Rei', variant: '1Kg', priceCents: 1500, imageUrl: img.boloRei },
    { name: 'Pão de Ló', variant: 'Pequeno', priceCents: 800, imageUrl: img.paoLo },
    { name: 'Pão de Ló', variant: 'Médio', priceCents: 1200, imageUrl: img.paoLo },
    { name: 'Pão de Jamón', variant: 'Normal', priceCents: 2000, imageUrl: img.jamon },
  ];

  const demoProdRows = await Promise.all(
    productsDemo.map((p) =>
      prisma.product.create({
        data: { ...p, lojaId: lojademo.id, active: true },
      })
    )
  );

  const dayDemoA = await prisma.availableDay.create({
    data: {
      lojaId: lojademo.id,
      pickupDate: d1,
      pickupEndDate: d1,
      ordersOpenAt: null,
      pickupTimeMin: '08:00',
      pickupTimeMax: '19:00',
      active: true,
      pickupDateRules: {
        create: {
          id: randomUUID(),
          lojaId: lojademo.id,
          pickupDate: d1,
          orderDeadline: orderDeadlineFar,
        },
      },
    },
  });

  await prisma.availableDay.create({
    data: {
      lojaId: lojademo.id,
      pickupDate: d2,
      pickupEndDate: d2,
      ordersOpenAt: null,
      pickupTimeMin: '09:00',
      pickupTimeMax: '18:00',
      active: true,
      pickupDateRules: {
        create: {
          id: randomUUID(),
          lojaId: lojademo.id,
          pickupDate: d2,
          orderDeadline: orderDeadlineFar,
        },
      },
    },
  });

  const [p0, p1, p2, p3, p4] = demoProdRows;

  await prisma.order.create({
    data: {
      lojaId: lojademo.id,
      availableDayId: dayDemoA.id,
      pickupDate: d1,
      pickupTime: '10:00',
      customerName: 'Maria Silva',
      customerPhone: '+351912345678',
      customerEmail: 'maria.silva@example.com',
      status: OrderStatus.RECEIVED,
      totalCents: p0.priceCents * 1 + p2.priceCents * 2,
      paid: true,
      items: {
        create: [
          line(p0, 1, false),
          line(p2, 2, false),
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      lojaId: lojademo.id,
      availableDayId: dayDemoA.id,
      pickupDate: d1,
      pickupTime: '11:00',
      customerName: 'João Costa',
      customerPhone: '+351923456789',
      status: OrderStatus.RECEIVED,
      totalCents: p4.priceCents * 1,
      paid: true,
      items: {
        create: [line(p4, 1, false)],
      },
    },
  });

  await prisma.order.create({
    data: {
      lojaId: lojademo.id,
      availableDayId: dayDemoA.id,
      pickupDate: d1,
      pickupTime: '14:00',
      customerName: 'Ana Rodrigues',
      customerPhone: '+351934567890',
      status: OrderStatus.READY,
      totalCents: p1.priceCents * 1 + p3.priceCents * 1,
      paid: true,
      items: {
        create: [line(p1, 1, true), line(p3, 1, true)],
      },
    },
  });

  await prisma.order.create({
    data: {
      lojaId: lojademo.id,
      availableDayId: dayDemoA.id,
      pickupDate: d1,
      pickupTime: '16:00',
      customerName: 'Carlos Mendes',
      customerPhone: '+351945678901',
      status: OrderStatus.PICKED_UP,
      totalCents: p0.priceCents * 2,
      paid: true,
      items: {
        create: [line(p0, 2, true)],
      },
    },
  });

  console.log('✅ Loja Demo: produtos, dias, 4 encomendas (vários estados)');

  // —— Flor de Esmoriz ——
  const flordeesmoriz = await prisma.loja.upsert({
    where: { slug: 'flordeesmoriz' },
    update: {
      name: 'Pastelaria Flor de Esmoriz',
      active: true,
      addressLine: 'Avenida Central, 45',
      postalCode: '3885-000',
      locality: 'Esmoriz',
      phone: '+351256000000',
    },
    create: {
      name: 'Pastelaria Flor de Esmoriz',
      slug: 'flordeesmoriz',
      timezone: 'Europe/Lisbon',
      active: true,
      plan: 'STARTER',
      addressLine: 'Avenida Central, 45',
      postalCode: '3885-000',
      locality: 'Esmoriz',
      phone: '+351256000000',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@flordeesmoriz.local' },
    update: { passwordHash: adminPasswordHash, lojaId: flordeesmoriz.id },
    create: {
      email: 'admin@flordeesmoriz.local',
      passwordHash: adminPasswordHash,
      role: 'LOJA_ADMIN',
      lojaId: flordeesmoriz.id,
    },
  });

  const productsFloris = [
    { name: 'Broa tradicional', variant: '800g', priceCents: 350, imageUrl: img.paoLo },
    { name: 'Folar da Páscoa', variant: '1Kg', priceCents: 1800, imageUrl: img.boloRei },
    { name: 'Regueifa', variant: 'Grande', priceCents: 220, imageUrl: img.paoLoPapel },
    { name: 'Pastel de nata', variant: 'Caixa 6', priceCents: 900, imageUrl: img.paoLo },
    { name: 'Bolo de arroz', variant: 'Médio', priceCents: 1100, imageUrl: img.paoLo },
  ];

  const florisRows = await Promise.all(
    productsFloris.map((p) =>
      prisma.product.create({
        data: { ...p, lojaId: flordeesmoriz.id, active: true },
      })
    )
  );

  const dayFloris = await prisma.availableDay.create({
    data: {
      lojaId: flordeesmoriz.id,
      pickupDate: d1,
      pickupEndDate: d1,
      ordersOpenAt: null,
      pickupTimeMin: '07:30',
      pickupTimeMax: '20:00',
      active: true,
      pickupDateRules: {
        create: {
          id: randomUUID(),
          lojaId: flordeesmoriz.id,
          pickupDate: d1,
          orderDeadline: orderDeadlineFar,
        },
      },
    },
  });

  await prisma.availableDay.create({
    data: {
      lojaId: flordeesmoriz.id,
      pickupDate: d2,
      pickupEndDate: d2,
      ordersOpenAt: null,
      pickupTimeMin: '08:00',
      pickupTimeMax: '19:30',
      active: true,
      pickupDateRules: {
        create: {
          id: randomUUID(),
          lojaId: flordeesmoriz.id,
          pickupDate: d2,
          orderDeadline: orderDeadlineFar,
        },
      },
    },
  });

  const [f0, f1, f2, f3, f4] = florisRows;

  await prisma.order.create({
    data: {
      lojaId: flordeesmoriz.id,
      availableDayId: dayFloris.id,
      pickupDate: d1,
      pickupTime: '09:00',
      customerName: 'Teresa Almeida',
      customerPhone: '+351911111111',
      status: OrderStatus.RECEIVED,
      totalCents: f0.priceCents * 2 + f2.priceCents * 1,
      paid: true,
      items: {
        create: [line(f0, 2, true), line(f2, 1, false)],
      },
    },
  });

  await prisma.order.create({
    data: {
      lojaId: flordeesmoriz.id,
      availableDayId: dayFloris.id,
      pickupDate: d1,
      pickupTime: '12:00',
      customerName: 'Rui Pereira',
      customerPhone: '+351922222222',
      status: OrderStatus.RECEIVED,
      totalCents: f3.priceCents * 1,
      paid: true,
      items: {
        create: [line(f3, 1, false)],
      },
    },
  });

  await prisma.order.create({
    data: {
      lojaId: flordeesmoriz.id,
      availableDayId: dayFloris.id,
      pickupDate: d1,
      pickupTime: '15:00',
      customerName: 'Sofia Martins',
      customerPhone: '+351933333333',
      status: OrderStatus.READY,
      totalCents: f1.priceCents * 1 + f4.priceCents * 1,
      paid: true,
      items: {
        create: [line(f1, 1, true), line(f4, 1, true)],
      },
    },
  });

  await prisma.order.create({
    data: {
      lojaId: flordeesmoriz.id,
      availableDayId: dayFloris.id,
      pickupDate: d1,
      pickupTime: '17:00',
      customerName: 'Paulo Neves',
      customerPhone: '+351944444444',
      status: OrderStatus.PICKED_UP,
      totalCents: f2.priceCents * 3,
      paid: true,
      items: {
        create: [line(f2, 3, true)],
      },
    },
  });

  console.log('✅ Flor de Esmoriz: produtos, dias, 4 encomendas (vários estados)');
  console.log('🌱 Seed completed!');
}

function line(
  product: { id: string; name: string; variant: string; priceCents: number },
  quantity: number,
  ready: boolean
) {
  return {
    productId: product.id,
    productNameSnapshot: product.name,
    variantSnapshot: product.variant,
    unitPriceCentsSnapshot: product.priceCents,
    quantity,
    ready,
  };
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
