import { randomUUID } from 'node:crypto';
import { PrismaClient, OrderStatus, Plan } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_IMAGES = {
  boloRei: '/uploads/seed/bolo-rei.jpg',
  paoLo: '/uploads/seed/pao-de-lo.jpg',
  paoLoPapel: '/uploads/seed/pao-de-lo-papel.jpg',
  jamon: '/uploads/seed/pao-de-jamon.jpg',
} as const;

type ImageKey = keyof typeof SEED_IMAGES;

type ProductSeed = {
  name: string;
  variant: string;
  priceCents: number;
  imageKey: ImageKey;
};

type LojaSeed = {
  slug: string;
  name: string;
  plan: Plan;
  addressLine: string;
  postalCode: string;
  locality: string;
  phone: string;
  adminEmail: string;
  pickupTimeMin: string;
  pickupTimeMax: string;
  products: ProductSeed[];
};

const LOJAS: LojaSeed[] = [
  {
    slug: 'lojademo',
    name: 'Loja Demo',
    plan: 'STARTER',
    addressLine: 'Rua da Loja Demo, 123',
    postalCode: '1000-001',
    locality: 'Lisboa',
    phone: '+351211000000',
    adminEmail: 'admin@lojademo.local',
    pickupTimeMin: '08:00',
    pickupTimeMax: '19:00',
    products: [
      { name: 'Bolo Rei', variant: '750g', priceCents: 1200, imageKey: 'boloRei' },
      { name: 'Bolo Rei', variant: '1Kg', priceCents: 1500, imageKey: 'boloRei' },
      { name: 'Pão de Ló', variant: 'Pequeno', priceCents: 800, imageKey: 'paoLo' },
      { name: 'Pão de Ló', variant: 'Médio', priceCents: 1200, imageKey: 'paoLo' },
      { name: 'Pão de Jamón', variant: 'Normal', priceCents: 2000, imageKey: 'jamon' },
      { name: 'Bolo Rainha', variant: '750g', priceCents: 1300, imageKey: 'boloRei' },
      { name: 'Filhós', variant: 'Caixa 12', priceCents: 600, imageKey: 'paoLoPapel' },
      { name: 'Sonhos', variant: 'Caixa 6', priceCents: 450, imageKey: 'paoLo' },
    ],
  },
  {
    slug: 'flordeesmoriz',
    name: 'Pastelaria Flor de Esmoriz',
    plan: 'STARTER',
    addressLine: 'Avenida Central, 45',
    postalCode: '3885-000',
    locality: 'Esmoriz',
    phone: '+351256000000',
    adminEmail: 'admin@flordeesmoriz.local',
    pickupTimeMin: '07:30',
    pickupTimeMax: '20:00',
    products: [
      { name: 'Broa tradicional', variant: '800g', priceCents: 350, imageKey: 'paoLo' },
      { name: 'Folar da Páscoa', variant: '1Kg', priceCents: 1800, imageKey: 'boloRei' },
      { name: 'Regueifa', variant: 'Grande', priceCents: 220, imageKey: 'paoLoPapel' },
      { name: 'Pastel de nata', variant: 'Caixa 6', priceCents: 900, imageKey: 'paoLo' },
      { name: 'Bolo de arroz', variant: 'Médio', priceCents: 1100, imageKey: 'paoLo' },
      { name: 'Pão de Deus', variant: 'Unidade', priceCents: 120, imageKey: 'paoLoPapel' },
      { name: 'Queijada', variant: 'Caixa 4', priceCents: 700, imageKey: 'paoLo' },
      { name: 'Bolo Rei', variant: '500g', priceCents: 950, imageKey: 'boloRei' },
    ],
  },
  {
    slug: 'padaria-central',
    name: 'Padaria Central do Porto',
    plan: 'PRO',
    addressLine: 'Rua de Cedofeita, 280',
    postalCode: '4050-180',
    locality: 'Porto',
    phone: '+351225100200',
    adminEmail: 'admin@padaria-central.local',
    pickupTimeMin: '07:00',
    pickupTimeMax: '20:30',
    products: [
      { name: 'Pão de centeio', variant: '700g', priceCents: 280, imageKey: 'paoLo' },
      { name: 'Pão de mistura', variant: '1Kg', priceCents: 320, imageKey: 'paoLo' },
      { name: 'Bolo Rei', variant: '1Kg', priceCents: 1600, imageKey: 'boloRei' },
      { name: 'Bolo Rainha', variant: '1Kg', priceCents: 1550, imageKey: 'boloRei' },
      { name: 'Pão de Ló', variant: 'Grande', priceCents: 1400, imageKey: 'paoLo' },
      { name: 'Pão de Jamón', variant: 'Família', priceCents: 2800, imageKey: 'jamon' },
      { name: 'Broa de milho', variant: '900g', priceCents: 380, imageKey: 'paoLoPapel' },
      { name: 'Trança doce', variant: 'Grande', priceCents: 650, imageKey: 'paoLoPapel' },
      { name: 'Rabanada', variant: 'Caixa 8', priceCents: 520, imageKey: 'paoLo' },
      { name: 'Arroz doce', variant: 'Família', priceCents: 890, imageKey: 'paoLo' },
    ],
  },
  {
    slug: 'doce-cascais',
    name: 'Doce Cascais',
    plan: 'PRO',
    addressLine: 'Avenida Marginal, 12',
    postalCode: '2750-374',
    locality: 'Cascais',
    phone: '+351214800300',
    adminEmail: 'admin@doce-cascais.local',
    pickupTimeMin: '08:30',
    pickupTimeMax: '19:00',
    products: [
      { name: 'Pastel de nata', variant: 'Caixa 12', priceCents: 1680, imageKey: 'paoLo' },
      { name: 'Queijada de Sintra', variant: 'Caixa 6', priceCents: 1140, imageKey: 'paoLo' },
      { name: 'Bolo Rei', variant: '750g', priceCents: 1350, imageKey: 'boloRei' },
      { name: 'Bolo de chocolate', variant: 'Médio', priceCents: 2200, imageKey: 'boloRei' },
      { name: 'Pão de Ló', variant: 'Médio', priceCents: 1250, imageKey: 'paoLo' },
      { name: 'Tarte de amêndoa', variant: 'Grande', priceCents: 1800, imageKey: 'paoLoPapel' },
      { name: 'Salame de chocolate', variant: 'Fatias', priceCents: 980, imageKey: 'paoLoPapel' },
      { name: 'Palmier', variant: 'Caixa 10', priceCents: 750, imageKey: 'paoLo' },
    ],
  },
  {
    slug: 'forno-da-vila',
    name: 'Forno da Vila',
    plan: 'STARTER',
    addressLine: 'Largo do Paço, 3',
    postalCode: '4700-223',
    locality: 'Braga',
    phone: '+351253400500',
    adminEmail: 'admin@forno-da-vila.local',
    pickupTimeMin: '07:30',
    pickupTimeMax: '19:30',
    products: [
      { name: 'Folar transmontano', variant: '1,2Kg', priceCents: 2100, imageKey: 'boloRei' },
      { name: 'Broa de Avintes', variant: '1Kg', priceCents: 420, imageKey: 'paoLo' },
      { name: 'Regueifa doce', variant: 'Grande', priceCents: 280, imageKey: 'paoLoPapel' },
      { name: 'Pão de Ló', variant: 'Pequeno', priceCents: 750, imageKey: 'paoLo' },
      { name: 'Bolo Rei', variant: '500g', priceCents: 900, imageKey: 'boloRei' },
      { name: 'Filhós de abóbora', variant: 'Caixa 10', priceCents: 550, imageKey: 'paoLoPapel' },
      { name: 'Cavacas', variant: 'Caixa 8', priceCents: 480, imageKey: 'paoLo' },
    ],
  },
  {
    slug: 'manteigaria-lisboa',
    name: 'Manteigaria Lisboa',
    plan: 'PREMIUM',
    addressLine: 'Rua do Loreto, 2',
    postalCode: '1200-237',
    locality: 'Lisboa',
    phone: '+351213600700',
    adminEmail: 'admin@manteigaria-lisboa.local',
    pickupTimeMin: '08:00',
    pickupTimeMax: '21:00',
    products: [
      { name: 'Pastel de nata', variant: 'Caixa 6', priceCents: 960, imageKey: 'paoLo' },
      { name: 'Pastel de nata', variant: 'Caixa 12', priceCents: 1800, imageKey: 'paoLo' },
      { name: 'Bolo Rei', variant: '750g', priceCents: 1450, imageKey: 'boloRei' },
      { name: 'Bolo Rei', variant: '1,5Kg', priceCents: 2400, imageKey: 'boloRei' },
      { name: 'Pão de Ló', variant: 'Médio', priceCents: 1300, imageKey: 'paoLo' },
      { name: 'Pão de Jamón', variant: 'Normal', priceCents: 2100, imageKey: 'jamon' },
      { name: 'Bolo Rainha', variant: '750g', priceCents: 1380, imageKey: 'boloRei' },
      { name: 'Torta de noz', variant: 'Fatia', priceCents: 420, imageKey: 'paoLoPapel' },
      { name: 'Croissant manteiga', variant: 'Caixa 4', priceCents: 640, imageKey: 'paoLoPapel' },
      { name: 'Bolo de bolacha', variant: 'Médio', priceCents: 1950, imageKey: 'boloRei' },
      { name: 'Arroz doce', variant: 'Individual', priceCents: 350, imageKey: 'paoLo' },
      { name: 'Leite creme', variant: 'Individual', priceCents: 320, imageKey: 'paoLo' },
    ],
  },
  {
    slug: 'confeitaria-aveiro',
    name: 'Confeitaria Aveiro',
    plan: 'PRO',
    addressLine: 'Rua João Mendonça, 18',
    postalCode: '3800-200',
    locality: 'Aveiro',
    phone: '+351234700800',
    adminEmail: 'admin@confeitaria-aveiro.local',
    pickupTimeMin: '08:00',
    pickupTimeMax: '20:00',
    products: [
      { name: 'Ovos moles', variant: 'Caixa 12', priceCents: 1500, imageKey: 'paoLo' },
      { name: 'Pão de Ló de Aveiro', variant: 'Médio', priceCents: 1350, imageKey: 'paoLo' },
      { name: 'Bolo Rei', variant: '1Kg', priceCents: 1580, imageKey: 'boloRei' },
      { name: 'Tripa de Aveiro', variant: 'Unidade', priceCents: 180, imageKey: 'paoLoPapel' },
      { name: 'Regueifa', variant: 'Média', priceCents: 200, imageKey: 'paoLoPapel' },
      { name: 'Broa de milho', variant: '800g', priceCents: 360, imageKey: 'paoLo' },
      { name: 'Queijada', variant: 'Caixa 6', priceCents: 960, imageKey: 'paoLo' },
      { name: 'Folar de ovos', variant: '1Kg', priceCents: 1750, imageKey: 'boloRei' },
    ],
  },
  {
    slug: 'pastelaria-sintra',
    name: 'Pastelaria Sintra',
    plan: 'STARTER',
    addressLine: 'Travessa da Fonte, 7',
    postalCode: '2710-590',
    locality: 'Sintra',
    phone: '+351219900100',
    adminEmail: 'admin@pastelaria-sintra.local',
    pickupTimeMin: '09:00',
    pickupTimeMax: '18:30',
    products: [
      { name: 'Queijada de Sintra', variant: 'Caixa 6', priceCents: 1200, imageKey: 'paoLo' },
      { name: 'Travesseiro', variant: 'Caixa 4', priceCents: 880, imageKey: 'paoLoPapel' },
      { name: 'Bolo Rei', variant: '750g', priceCents: 1280, imageKey: 'boloRei' },
      { name: 'Pão de Ló', variant: 'Pequeno', priceCents: 820, imageKey: 'paoLo' },
      { name: 'Pão de Jamón', variant: 'Normal', priceCents: 1950, imageKey: 'jamon' },
      { name: 'Colares', variant: 'Caixa 8', priceCents: 720, imageKey: 'paoLo' },
      { name: 'Fofos de Belas', variant: 'Caixa 6', priceCents: 690, imageKey: 'paoLoPapel' },
    ],
  },
];

const DEMO_SLUGS = LOJAS.map((l) => l.slug);

const CUSTOMER_NAMES = [
  'Maria Silva',
  'João Costa',
  'Ana Rodrigues',
  'Carlos Mendes',
  'Teresa Almeida',
  'Rui Pereira',
  'Sofia Martins',
  'Paulo Neves',
  'Inês Ferreira',
  'Miguel Santos',
  'Beatriz Lopes',
  'Pedro Oliveira',
  'Catarina Ribeiro',
  'António Gomes',
  'Helena Carvalho',
  'Francisco Dias',
  'Luísa Monteiro',
  'Ricardo Pinto',
  'Mariana Correia',
  'Duarte Nunes',
];

const PICKUP_HOURS = ['09:00', '10:00', '10:30', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

/** Data civil a N dias de hoje (hora local, meio-dia). */
function dateAtOffset(daysFromToday: number): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + daysFromToday, 12, 0, 0, 0);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function statusForAge(daysAgo: number): OrderStatus {
  if (daysAgo > 14) return OrderStatus.PICKED_UP;
  if (daysAgo > 5) return pickRandom([OrderStatus.PICKED_UP, OrderStatus.READY]);
  return pickRandom([OrderStatus.RECEIVED, OrderStatus.READY, OrderStatus.PICKED_UP]);
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

async function ensureAvailableDay(
  lojaId: string,
  pickupDate: Date,
  orderDeadline: Date,
  pickupTimeMin: string,
  pickupTimeMax: string
) {
  const existing = await prisma.availableDay.findFirst({
    where: { lojaId, pickupDate },
  });
  if (existing) return existing;

  return prisma.availableDay.create({
    data: {
      lojaId,
      pickupDate,
      pickupEndDate: pickupDate,
      ordersOpenAt: null,
      pickupTimeMin,
      pickupTimeMax,
      active: true,
      pickupDateRules: {
        create: {
          id: randomUUID(),
          lojaId,
          pickupDate,
          orderDeadline,
        },
      },
    },
  });
}

async function createOrder(
  lojaId: string,
  availableDayId: string,
  pickupDate: Date,
  products: Array<{ id: string; name: string; variant: string; priceCents: number }>,
  opts: {
    pickupTime: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    status: OrderStatus;
    createdAt: Date;
    itemCount?: number;
    paid?: boolean;
  }
) {
  const itemCount = opts.itemCount ?? randomInt(1, 3);
  const used = new Set<string>();
  const items = [];
  let totalCents = 0;

  for (let i = 0; i < itemCount; i++) {
    const product = pickRandom(products);
    if (used.has(product.id) && products.length > itemCount) {
      i--;
      continue;
    }
    used.add(product.id);
    const quantity = randomInt(1, 3);
    const ready = opts.status !== OrderStatus.RECEIVED;
    items.push(line(product, quantity, ready));
    totalCents += product.priceCents * quantity;
  }

  await prisma.order.create({
    data: {
      lojaId,
      availableDayId,
      pickupDate,
      pickupTime: opts.pickupTime,
      customerName: opts.customerName,
      customerPhone: opts.customerPhone,
      customerEmail: opts.customerEmail,
      status: opts.status,
      totalCents,
      paid: opts.paid ?? true,
      createdAt: opts.createdAt,
      items: { create: items },
    },
  });
}

async function seedHistoricalOrders(
  lojaId: string,
  products: Array<{ id: string; name: string; variant: string; priceCents: number }>,
  pickupTimeMin: string,
  pickupTimeMax: string,
  count: number
) {
  for (let i = 0; i < count; i++) {
    const daysAgo = randomInt(1, 60);
    const pickupOffset = randomInt(-3, 10);
    const pickupDate = dateAtOffset(pickupOffset);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(randomInt(8, 20), randomInt(0, 59), 0, 0);

    const orderDeadline = new Date(pickupDate);
    orderDeadline.setDate(orderDeadline.getDate() - 1);
    orderDeadline.setHours(20, 0, 0, 0);

    const day = await ensureAvailableDay(
      lojaId,
      pickupDate,
      orderDeadline,
      pickupTimeMin,
      pickupTimeMax
    );

    const status = statusForAge(daysAgo);
    const phoneSuffix = String(910000000 + randomInt(0, 89999999)).slice(-9);

    await createOrder(lojaId, day.id, pickupDate, products, {
      pickupTime: pickRandom(PICKUP_HOURS),
      customerName: pickRandom(CUSTOMER_NAMES),
      customerPhone: `+3519${phoneSuffix}`,
      customerEmail: Math.random() > 0.4 ? `cliente${i + 1}@example.com` : undefined,
      status,
      createdAt,
      paid: Math.random() > 0.08,
    });
  }
}

async function provisionLoja(
  seed: LojaSeed,
  adminPasswordHash: string,
  d1: Date,
  d2: Date,
  orderDeadlineFar: Date
) {
  const loja = await prisma.loja.upsert({
    where: { slug: seed.slug },
    update: {
      name: seed.name,
      active: true,
      plan: seed.plan,
      addressLine: seed.addressLine,
      postalCode: seed.postalCode,
      locality: seed.locality,
      phone: seed.phone,
    },
    create: {
      name: seed.name,
      slug: seed.slug,
      timezone: 'Europe/Lisbon',
      active: true,
      plan: seed.plan,
      addressLine: seed.addressLine,
      postalCode: seed.postalCode,
      locality: seed.locality,
      phone: seed.phone,
    },
  });

  await prisma.user.upsert({
    where: { email: seed.adminEmail },
    update: { passwordHash: adminPasswordHash, lojaId: loja.id },
    create: {
      email: seed.adminEmail,
      passwordHash: adminPasswordHash,
      role: 'LOJA_ADMIN',
      lojaId: loja.id,
    },
  });

  const productRows = await Promise.all(
    seed.products.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          variant: p.variant,
          priceCents: p.priceCents,
          imageUrl: SEED_IMAGES[p.imageKey],
          lojaId: loja.id,
          active: true,
        },
      })
    )
  );

  const dayA = await ensureAvailableDay(loja.id, d1, orderDeadlineFar, seed.pickupTimeMin, seed.pickupTimeMax);
  await ensureAvailableDay(loja.id, d2, orderDeadlineFar, seed.pickupTimeMin, seed.pickupTimeMax);

  const upcomingOrders = randomInt(3, 6);
  for (let i = 0; i < upcomingOrders; i++) {
    const status = pickRandom([
      OrderStatus.RECEIVED,
      OrderStatus.RECEIVED,
      OrderStatus.READY,
      OrderStatus.PICKED_UP,
    ]);
    const phoneSuffix = String(920000000 + randomInt(0, 79999999)).slice(-9);

    await createOrder(loja.id, dayA.id, d1, productRows, {
      pickupTime: PICKUP_HOURS[i % PICKUP_HOURS.length]!,
      customerName: CUSTOMER_NAMES[i % CUSTOMER_NAMES.length]!,
      customerPhone: `+3519${phoneSuffix}`,
      status,
      createdAt: new Date(Date.now() - randomInt(0, 48) * 60 * 60 * 1000),
      itemCount: randomInt(1, 4),
      paid: true,
    });
  }

  const historicalCount = seed.plan === 'PREMIUM' ? 28 : seed.plan === 'PRO' ? 22 : 16;
  await seedHistoricalOrders(
    loja.id,
    productRows,
    seed.pickupTimeMin,
    seed.pickupTimeMax,
    historicalCount
  );

  const totalOrders = upcomingOrders + historicalCount;
  console.log(
    `✅ ${seed.name}: ${productRows.length} produtos, dias futuros, ${totalOrders} encomendas`
  );

  return { loja, productCount: productRows.length, orderCount: totalOrders };
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
  const d1 = dateAtOffset(1);
  const d2 = dateAtOffset(2);
  const orderDeadlineFar = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

  const demoLojas = await prisma.loja.findMany({
    where: { slug: { in: [...DEMO_SLUGS] } },
    select: { id: true },
  });
  for (const b of demoLojas) {
    await prisma.order.deleteMany({ where: { lojaId: b.id } });
    await prisma.availableDayProductCap.deleteMany({ where: { lojaId: b.id } });
    await prisma.availableDay.deleteMany({ where: { lojaId: b.id } });
    await prisma.product.deleteMany({ where: { lojaId: b.id } });
  }

  let totalProducts = 0;
  let totalOrders = 0;

  for (const lojaSeed of LOJAS) {
    const result = await provisionLoja(lojaSeed, adminPasswordHash, d1, d2, orderDeadlineFar);
    totalProducts += result.productCount;
    totalOrders += result.orderCount;
  }

  console.log('');
  console.log(`📊 Resumo: ${LOJAS.length} lojas, ${totalProducts} produtos, ${totalOrders} encomendas`);
  console.log('🌱 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
