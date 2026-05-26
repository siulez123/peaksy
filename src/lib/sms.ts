import type { FastifyBaseLogger } from 'fastify/types/logger';
import type { SmsCredentials } from './lojaNotificationConfig';

/** Envia SMS via Twilio. Se `required`, falha com erro legível quando não configurado ou Twilio rejeita. */
export async function sendSms(
  to: string,
  body: string,
  log: FastifyBaseLogger,
  opts?: { required?: boolean; credentials: SmsCredentials | null }
): Promise<void> {
  const creds = opts?.credentials ?? null;

  if (!creds) {
    const msg = 'SMS não configurado para esta loja.';
    if (opts?.required) {
      throw new Error(msg);
    }
    log.warn(msg);
    return;
  }

  const { accountSid: sid, authToken: token, fromNumber: from } = creds;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({ To: to.trim(), From: from, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const t = await res.text();
    log.error({ status: res.status, body: t }, 'Falha ao enviar SMS (Twilio)');
    if (opts?.required) {
      throw new Error('Não foi possível enviar o SMS. Verifica o número ou tenta mais tarde.');
    }
  }
}
