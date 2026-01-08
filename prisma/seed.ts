import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create super admin
  const superAdminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@comebolos.local' },
    update: {},
    create: {
      email: 'super@comebolos.local',
      passwordHash: superAdminPasswordHash,
      role: 'SUPER_ADMIN',
      bakeryId: null,
    },
  });
  console.log('✅ Super admin created:', superAdmin.email);

  // Create demo bakery
  const bakery = await prisma.bakery.upsert({
    where: { slug: 'padariademo' },
    update: {},
    create: {
      name: 'Padaria Demo',
      slug: 'padariademo',
      timezone: 'Europe/Lisbon',
      active: true,
      plan: 'STARTER',
    },
  });
  console.log('✅ Bakery created:', bakery.name);

  // Create bakery admin
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const bakeryAdmin = await prisma.user.upsert({
    where: { email: 'admin@padariademo.local' },
    update: {},
    create: {
      email: 'admin@padariademo.local',
      passwordHash: adminPasswordHash,
      role: 'BAKERY_ADMIN',
      bakeryId: bakery.id,
    },
  });
  console.log('✅ Bakery admin created:', bakeryAdmin.email);

  // Create products
  const products = [
    { name: 'Bolo Rei', variant: '750g', priceCents: 1200 },
    { name: 'Bolo Rei', variant: '1Kg', priceCents: 1500 },
    { name: 'Bolo Rei', variant: '1,5Kg', priceCents: 2000 },
    { name: 'Pão de Ló', variant: 'Pequeno', priceCents: 800 },
    { name: 'Pão de Ló', variant: 'Médio', priceCents: 1200 },
    { name: 'Pão de Ló', variant: 'Grande', priceCents: 1800 },
    { name: 'Pão de Ló de Papel', variant: 'Único', priceCents: 1000 },
    { name: 'Pão de Jamón', variant: 'Pequeno', priceCents: 1500 },
    { name: 'Pão de Jamón', variant: 'Normal', priceCents: 2000 },
    { name: 'Pão de Jamón', variant: 'Sem passas', priceCents: 2200 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        bakeryId: bakery.id,
        active: true,
      },
    });
  }
  console.log(`✅ Created ${products.length} products`);

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

