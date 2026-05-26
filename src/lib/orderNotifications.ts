import nodemailer from 'nodemailer';
import type { PrismaClient } from '@prisma/client';
import type { FastifyBaseLogger } from 'fastify/types/logger';
import { normalizePhoneE164 } from './phoneE164';
import { sendSms } from './sms';

function formatMoneyEUR(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail(to: string, subject: string, html: string, log: FastifyBaseLogger): Promise<void> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    log.warn('Email não enviado: define SMTP_HOST (e credenciais se necessário)');
    return;
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS !== undefined
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({ from, to, subject, html });
}

async function notifyOrderCore(
  orderId: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger,
  opts: { paidOnline: boolean }
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      loja: { select: { name: true } },
    },
  });

  if (!order) return;

  const pickup = order.pickupDate.toISOString().slice(0, 10);
  const pickupWhen = `${pickup} ${order.pickupTime}`;
  const linesShort = order.items.map((i) => `${i.productNameSnapshot} x${i.quantity}`).join(', ');
  const total = formatMoneyEUR(order.totalCents);
  const statusLine = opts.paidOnline
    ? `encomenda paga ${total}`
    : `encomenda registada ${total} (pagamento na loja)`;
  const smsBody = `${order.loja.name}: ${statusLine}. Levantamento ${pickupWhen}. ${linesShort}`.slice(
    0,
    1500
  );

  const smsTo = normalizePhoneE164(order.customerPhone) ?? order.customerPhone.trim();
  await sendSms(smsTo, smsBody, log);

  const email = order.customerEmail?.trim();
  if (email) {
    const subject = `Encomenda confirmada — ${order.loja.name}`;
    const itemsHtml = order.items
      .map(
        (i) =>
          `<li>${escapeHtml(i.productNameSnapshot)} ${escapeHtml(i.variantSnapshot)} — ${i.quantity} × ${formatMoneyEUR(i.unitPriceCentsSnapshot)} = <strong>${formatMoneyEUR(i.unitPriceCentsSnapshot * i.quantity)}</strong></li>`
      )
      .join('');

    const html = `
      <p>Olá ${escapeHtml(order.customerName)},</p>
      <p>A tua encomenda em <strong>${escapeHtml(order.loja.name)}</strong> foi ${
        opts.paidOnline
          ? 'paga com sucesso'
          : 'registada. O pagamento será feito no levantamento na loja'
      }.</p>
      <p><strong>Total:</strong> ${total}<br/>
      <strong>Levantamento:</strong> ${pickup} às ${escapeHtml(order.pickupTime)}</p>
      <ul>${itemsHtml}</ul>
      ${order.notes ? `<p><strong>Notas:</strong> ${escapeHtml(order.notes)}</p>` : ''}
      <p>Obrigado!</p>
    `;

    try {
      await sendEmail(email, subject, html, log);
    } catch (e) {
      log.error({ err: e }, 'Falha ao enviar email de confirmação');
    }
  }
}

/** Após pagamento Stripe confirmado. */
export async function notifyOrderPaid(
  orderId: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger
): Promise<void> {
  return notifyOrderCore(orderId, prisma, log, { paidOnline: true });
}

/** Encomenda com pagamento na loja (sem Stripe). */
export async function notifyOrderInStore(
  orderId: string,
  prisma: PrismaClient,
  log: FastifyBaseLogger
): Promise<void> {
  return notifyOrderCore(orderId, prisma, log, { paidOnline: false });
}
