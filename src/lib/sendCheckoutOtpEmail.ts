import nodemailer from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify/types/logger';
import type { SmtpCredentials } from './lojaNotificationConfig';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendCheckoutOtpEmail(
  smtp: SmtpCredentials,
  to: string,
  lojaName: string,
  code: string,
  log: FastifyBaseLogger
): Promise<void> {
  const subject = `Código de confirmação — ${lojaName}`;
  const html = `
    <p>Olá,</p>
    <p>O teu código de confirmação de encomenda em <strong>${escapeHtml(lojaName)}</strong> é:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${escapeHtml(code)}</p>
    <p>Válido durante 10 minutos.</p>
  `;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth:
      smtp.user && smtp.password !== null && smtp.password !== ''
        ? { user: smtp.user, pass: smtp.password }
        : undefined,
  });

  try {
    await transporter.sendMail({ from: smtp.from, to, subject, html });
  } catch (e) {
    log.error({ err: e }, 'Falha ao enviar email com código OTP');
    throw new Error('Não foi possível enviar o email. Verifica o endereço ou tenta mais tarde.');
  }
}
