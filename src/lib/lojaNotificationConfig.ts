/** Campos de notificação por loja (Prisma select). */
export const lojaNotificationSelect = {
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUser: true,
  smtpPassword: true,
  emailFrom: true,
  twilioAccountSid: true,
  twilioAuthToken: true,
  twilioFromNumber: true,
} as const;

export type LojaNotificationConfig = {
  smtpHost: string | null;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPassword: string | null;
  emailFrom: string | null;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioFromNumber: string | null;
};

export type SmtpCredentials = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  from: string;
};

export type SmsCredentials = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export function lojaHasSmtp(loja: Pick<LojaNotificationConfig, 'smtpHost' | 'emailFrom'>): boolean {
  return Boolean(loja.smtpHost?.trim() && loja.emailFrom?.trim());
}

export function lojaHasSms(
  loja: Pick<LojaNotificationConfig, 'twilioAccountSid' | 'twilioAuthToken' | 'twilioFromNumber'>
): boolean {
  return Boolean(
    loja.twilioAccountSid?.trim() &&
      loja.twilioAuthToken?.trim() &&
      loja.twilioFromNumber?.trim()
  );
}

export function lojaSmtpCredentials(loja: LojaNotificationConfig): SmtpCredentials | null {
  const host = loja.smtpHost?.trim();
  const from = loja.emailFrom?.trim();
  if (!host || !from) return null;
  return {
    host,
    port: loja.smtpPort || 587,
    secure: loja.smtpSecure,
    user: loja.smtpUser?.trim() || null,
    password: loja.smtpPassword,
    from,
  };
}

export function lojaSmsCredentials(loja: LojaNotificationConfig): SmsCredentials | null {
  const accountSid = loja.twilioAccountSid?.trim();
  const authToken = loja.twilioAuthToken?.trim();
  const fromNumber = loja.twilioFromNumber?.trim();
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}
