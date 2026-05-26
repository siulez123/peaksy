import { useCallback, useEffect, useState } from 'react';
import { adminApi, type LojaStripeSettings, type StripeCheckoutMethod } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, SectionTitle } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

type Settings = {
  allowOnlinePayment: boolean;
  allowInStorePayment: boolean;
  inStoreVerifySms: boolean;
  inStoreVerifyEmail: boolean;
};

const PAYMENT_METHODS: StripeCheckoutMethod[] = ['card', 'mb_way'];

function smsConfigured(notif: {
  twilio: { accountSid: string | null; fromNumber: string | null; authTokenConfigured: boolean };
}): boolean {
  return Boolean(
    notif.twilio.accountSid?.trim() &&
      notif.twilio.fromNumber?.trim() &&
      notif.twilio.authTokenConfigured
  );
}

function smtpConfigured(notif: {
  smtp: { host: string | null; emailFrom: string | null };
}): boolean {
  return Boolean(notif.smtp.host?.trim() && notif.smtp.emailFrom?.trim());
}

function stripeConfigured(stripe: LojaStripeSettings): boolean {
  return stripe.secretKeyConfigured && stripe.webhookSecretConfigured;
}

export function AdminPayment() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [stripe, setStripe] = useState<LojaStripeSettings | null>(null);
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<StripeCheckoutMethod[]>(['card', 'mb_way']);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stripeSaving, setStripeSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stripeSaved, setStripeSaved] = useState(false);
  const [inStoreSmsOk, setInStoreSmsOk] = useState(false);
  const [inStoreSmtpOk, setInStoreSmtpOk] = useState(false);

  const load = useCallback(async () => {
    if (!token || !slug) return;
    try {
      const [data, notif, stripeData] = await Promise.all([
        adminApi.paymentSettings.get(token, slug),
        adminApi.notificationSettings.get(token, slug),
        adminApi.stripeSettings.get(token, slug),
      ]);
      setSettings(data);
      setInStoreSmsOk(smsConfigured(notif));
      setInStoreSmtpOk(smtpConfigured(notif));
      setStripe(stripeData);
      setStripeSecretKey('');
      setStripeWebhookSecret('');
      setPaymentMethods(
        stripeData.paymentMethods.length > 0
          ? stripeData.paymentMethods
          : ['card', 'mb_way']
      );
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
      setSettings(null);
      setStripe(null);
    }
  }, [token, slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !slug || !settings) return;
    if (!settings.allowOnlinePayment && !settings.allowInStorePayment) {
      setErr(t('adminPayment.atLeastOne'));
      return;
    }
    setSaving(true);
    setErr(null);
    setSaved(false);
    try {
      const data = await adminApi.paymentSettings.update(token, slug, settings);
      setSettings(data);
      setSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };

  const saveStripe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !slug) return;
    if (paymentMethods.length === 0) {
      setErr(t('adminPayment.stripeMethodRequired'));
      return;
    }
    setStripeSaving(true);
    setErr(null);
    setStripeSaved(false);
    try {
      const body: Record<string, unknown> = { paymentMethods };
      if (stripeSecretKey.trim()) body.stripeSecretKey = stripeSecretKey.trim();
      if (stripeWebhookSecret.trim()) body.stripeWebhookSecret = stripeWebhookSecret.trim();
      const data = await adminApi.stripeSettings.update(token, slug, body);
      setStripe(data);
      setStripeSecretKey('');
      setStripeWebhookSecret('');
      setPaymentMethods(data.paymentMethods);
      setStripeSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setStripeSaving(false);
    }
  };

  const toggleMethod = (method: StripeCheckoutMethod) => {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const setInStoreEnabled = (enabled: boolean) => {
    setSettings((s) =>
      s
        ? {
            ...s,
            allowInStorePayment: enabled,
            ...(enabled ? {} : { inStoreVerifySms: false, inStoreVerifyEmail: false }),
          }
        : s
    );
  };

  const setVerifySms = (checked: boolean) => {
    setSettings((s) =>
      s
        ? {
            ...s,
            inStoreVerifySms: checked,
            inStoreVerifyEmail: checked ? false : s.inStoreVerifyEmail,
          }
        : s
    );
  };

  const setVerifyEmail = (checked: boolean) => {
    setSettings((s) =>
      s
        ? {
            ...s,
            inStoreVerifyEmail: checked,
            inStoreVerifySms: checked ? false : s.inStoreVerifySms,
          }
        : s
    );
  };

  return (
    <div className="space-y-8">
      <SectionTitle title={t('adminPayment.title')} description={t('adminPayment.subtitle')} />

      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      {saved && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('adminPayment.saved')}
        </p>
      )}

      {!settings && !err && <p className="text-sm text-muted">{t('common.loading')}</p>}

      {settings && (
        <Card>
          <form onSubmit={save} className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-slate-50/80">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-400"
                checked={settings.allowOnlinePayment}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, allowOnlinePayment: e.target.checked } : s
                  )
                }
              />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {t('adminPayment.onlineTitle')}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {t('adminPayment.onlineDesc')}
                </span>
              </span>
            </label>

            {settings.allowOnlinePayment && stripe && !stripeConfigured(stripe) && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {t('adminPayment.onlineStripeHint')}
              </p>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-slate-50/80">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-400"
                checked={settings.allowInStorePayment}
                onChange={(e) => setInStoreEnabled(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {t('adminPayment.inStoreTitle')}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {t('adminPayment.inStoreDesc')}
                </span>
              </span>
            </label>

            {settings.allowInStorePayment && (
              <div className="space-y-3 rounded-xl border border-border bg-canvas/50 p-4">
                <p className="text-sm font-semibold text-ink">{t('adminPayment.inStoreVerifyTitle')}</p>
                <p className="text-xs leading-relaxed text-muted">
                  {t('adminPayment.inStoreVerifyDesc')}
                </p>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 ${
                    !inStoreSmsOk ? 'opacity-60' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-400"
                    checked={settings.inStoreVerifySms}
                    disabled={!inStoreSmsOk}
                    onChange={(e) => setVerifySms(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {t('adminPayment.inStoreVerifySms')}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {t('adminPayment.inStoreVerifySmsDesc')}
                    </span>
                  </span>
                </label>
                {!inStoreSmsOk && (
                  <p className="text-xs text-amber-800">{t('adminPayment.inStoreVerifySmsHint')}</p>
                )}

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3 ${
                    !inStoreSmtpOk ? 'opacity-60' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-400"
                    checked={settings.inStoreVerifyEmail}
                    disabled={!inStoreSmtpOk}
                    onChange={(e) => setVerifyEmail(e.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {t('adminPayment.inStoreVerifyEmail')}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {t('adminPayment.inStoreVerifyEmailDesc')}
                    </span>
                  </span>
                </label>
                {!inStoreSmtpOk && (
                  <p className="text-xs text-amber-800">{t('adminPayment.inStoreVerifyEmailHint')}</p>
                )}

                {!settings.inStoreVerifySms && !settings.inStoreVerifyEmail && (
                  <p className="text-xs text-muted">{t('adminPayment.inStoreVerifyNone')}</p>
                )}
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </form>
        </Card>
      )}

      {stripe && (
        <section>
          <h2 className="mb-1 text-lg font-semibold text-ink">{t('adminPayment.stripeTitle')}</h2>
          <p className="mb-4 text-sm text-muted">{t('adminPayment.stripeDesc')}</p>
          <Card>
            <form onSubmit={saveStripe} className="space-y-4">
              <div>
                <Label>{t('adminPayment.stripeSecretKey')}</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={stripeSecretKey}
                  placeholder={
                    stripe.secretKeyConfigured
                      ? t('adminPayment.stripeSecretKeyPlaceholder')
                      : 'sk_live_...'
                  }
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                />
              </div>
              <div>
                <Label>{t('adminPayment.stripeWebhookSecret')}</Label>
                <Input
                  type="password"
                  autoComplete="off"
                  value={stripeWebhookSecret}
                  placeholder={
                    stripe.webhookSecretConfigured
                      ? t('adminPayment.stripeWebhookSecretPlaceholder')
                      : 'whsec_...'
                  }
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                />
              </div>
              <div>
                <Label>{t('adminPayment.stripeWebhookUrl')}</Label>
                <Input readOnly value={stripe.webhookUrl} className="font-mono text-xs" />
                <p className="mt-1 text-xs text-muted">{t('adminPayment.stripeWebhookUrlHint')}</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-ink">
                  {t('adminPayment.stripeMethodsTitle')}
                </p>
                <div className="flex flex-wrap gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-400"
                        checked={paymentMethods.includes(method)}
                        onChange={() => toggleMethod(method)}
                      />
                      {t(`adminPayment.stripeMethod.${method}`)}
                    </label>
                  ))}
                </div>
              </div>
              {stripeSaved && (
                <p className="text-sm text-emerald-700">{t('adminPayment.stripeSaved')}</p>
              )}
              <Button type="submit" disabled={stripeSaving}>
                {stripeSaving ? t('common.saving') : t('common.saveChanges')}
              </Button>
            </form>
          </Card>
        </section>
      )}
    </div>
  );
}
