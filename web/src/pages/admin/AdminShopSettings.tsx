import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  adminApi,
  type LojaNotificationSettings,
  type ProductDisplayLayout,
  type ShopColorPalette,
} from '../../api';
import { SHOP_COLOR_PALETTES, SHOP_PALETTE_TOKENS } from '../../lib/shopColorPalettes';
import { vatShortLabel } from '../../lib/vatLabel';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, SectionTitle } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

type VatRateRow = {
  id: string;
  label: string;
  ratePercent: number;
  sortOrder: number;
  productCount: number;
};

const LAYOUTS: ProductDisplayLayout[] = ['LARGE', 'MEDIUM', 'SMALL'];

export function AdminShopSettings() {
  const { t, localeTag } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [rates, setRates] = useState<VatRateRow[]>([]);
  const [layout, setLayout] = useState<ProductDisplayLayout>('LARGE');
  const [palette, setPalette] = useState<ShopColorPalette>('INDIGO');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vatSaving, setVatSaving] = useState(false);
  const [displaySaving, setDisplaySaving] = useState(false);
  const [displaySaved, setDisplaySaved] = useState(false);
  const [notifications, setNotifications] = useState<LojaNotificationSettings | null>(null);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [emailFrom, setEmailFrom] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioFromNumber, setTwilioFromNumber] = useState('');
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newRate, setNewRate] = useState('');

  const load = useCallback(async () => {
    if (!token || !slug) return;
    setLoading(true);
    try {
      const [vatList, display, notif] = await Promise.all([
        adminApi.vatRates.list(token, slug),
        adminApi.shopDisplay.get(token, slug),
        adminApi.notificationSettings.get(token, slug),
      ]);
      setRates(vatList);
      setLayout(display.productDisplayLayout);
      setPalette(display.colorPalette);
      setNotifications(notif);
      setSmtpHost(notif.smtp.host ?? '');
      setSmtpPort(String(notif.smtp.port || 587));
      setSmtpSecure(notif.smtp.secure);
      setSmtpUser(notif.smtp.user ?? '');
      setSmtpPassword('');
      setEmailFrom(notif.smtp.emailFrom ?? '');
      setTwilioAccountSid(notif.twilio.accountSid ?? '');
      setTwilioAuthToken('');
      setTwilioFromNumber(notif.twilio.fromNumber ?? '');
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setLoading(false);
    }
  }, [token, slug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const addVatRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !slug) return;
    const ratePercent = parseFloat(newRate.replace(',', '.'));
    if (!newLabel.trim() || !Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      setErr(t('adminShop.invalidVat'));
      return;
    }
    setVatSaving(true);
    setErr(null);
    try {
      await adminApi.vatRates.create(token, slug, {
        label: newLabel.trim(),
        ratePercent,
      });
      setNewLabel('');
      setNewRate('');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setVatSaving(false);
    }
  };

  const removeVatRate = async (id: string) => {
    if (!token || !slug || !confirm(t('adminShop.confirmDeleteVat'))) return;
    setErr(null);
    try {
      await adminApi.vatRates.remove(token, slug, id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    }
  };

  const saveDisplay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !slug) return;
    setDisplaySaving(true);
    setErr(null);
    setDisplaySaved(false);
    try {
      const data = await adminApi.shopDisplay.update(token, slug, {
        productDisplayLayout: layout,
        colorPalette: palette,
      });
      setLayout(data.productDisplayLayout);
      setPalette(data.colorPalette);
      setDisplaySaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setDisplaySaving(false);
    }
  };

  const layoutLabel = (l: ProductDisplayLayout) => t(`adminShop.layout.${l}`);

  const saveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !slug) return;
    const port = parseInt(smtpPort, 10);
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
      setErr(t('common.genericError'));
      return;
    }
    setNotifSaving(true);
    setErr(null);
    setNotifSaved(false);
    try {
      const body: Record<string, unknown> = {
        smtpHost: smtpHost.trim() || null,
        smtpPort: port,
        smtpSecure,
        smtpUser: smtpUser.trim() || null,
        emailFrom: emailFrom.trim() || null,
        twilioAccountSid: twilioAccountSid.trim() || null,
        twilioFromNumber: twilioFromNumber.trim() || null,
      };
      if (smtpPassword.trim()) body.smtpPassword = smtpPassword;
      if (twilioAuthToken.trim()) body.twilioAuthToken = twilioAuthToken;
      const data = await adminApi.notificationSettings.update(token, slug, body);
      setNotifications(data);
      setSmtpPassword('');
      setTwilioAuthToken('');
      setNotifSaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <SectionTitle title={t('adminShop.title')} description={t('adminShop.subtitle')} />

      {err && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      {loading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <>
          <section>
            <h2 className="mb-1 text-lg font-semibold text-ink">{t('adminShop.vatTitle')}</h2>
            <p className="mb-4 text-sm text-muted">{t('adminShop.vatDesc')}</p>
            <Card className="space-y-4">
              <ul className="divide-y divide-border">
                {rates.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-ink">
                        {vatShortLabel(r.ratePercent, r.label, localeTag, t)}
                      </p>
                      <p className="text-sm text-muted">
                        {r.productCount > 0
                          ? t('adminShop.vatProductCount', { count: r.productCount })
                          : t('adminShop.vatPercent', { rate: r.ratePercent })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={r.productCount > 0}
                      title={r.productCount > 0 ? t('adminShop.vatInUse') : undefined}
                      onClick={() => void removeVatRate(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>

              <form onSubmit={addVatRate} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <div>
                  <Label>{t('adminShop.vatLabel')}</Label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={t('adminShop.vatLabelPlaceholder')}
                    required
                  />
                </div>
                <div>
                  <Label>{t('adminShop.vatRate')}</Label>
                  <Input
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="23"
                    inputMode="decimal"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={vatSaving} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4" aria-hidden />
                    {vatSaving ? t('common.saving') : t('adminShop.addVat')}
                  </Button>
                </div>
              </form>
            </Card>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-semibold text-ink">{t('adminShop.displayTitle')}</h2>
            <p className="mb-4 text-sm text-muted">{t('adminShop.displayDesc')}</p>
            {displaySaved && (
              <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {t('adminShop.displaySaved')}
              </p>
            )}
            <Card>
              <form onSubmit={saveDisplay} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {LAYOUTS.map((l) => (
                    <label
                      key={l}
                      className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-colors ${
                        layout === l
                          ? 'border-primary bg-primary-soft/40 ring-1 ring-primary/30'
                          : 'border-border hover:bg-slate-50/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="productDisplayLayout"
                        className="sr-only"
                        checked={layout === l}
                        onChange={() => setLayout(l)}
                      />
                      <span className="text-sm font-semibold text-ink">{layoutLabel(l)}</span>
                      <span className="mt-1 text-xs leading-relaxed text-muted">
                        {t(`adminShop.layoutDesc.${l}`)}
                      </span>
                    </label>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">{t('adminShop.paletteTitle')}</p>
                  <p className="mb-3 text-xs text-muted">{t('adminShop.paletteDesc')}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {SHOP_COLOR_PALETTES.map((p) => {
                      const tokens = SHOP_PALETTE_TOKENS[p];
                      return (
                        <label
                          key={p}
                          className={`flex cursor-pointer flex-col rounded-xl border p-3 transition-colors ${
                            palette === p
                              ? 'border-primary bg-primary-soft/40 ring-1 ring-primary/30'
                              : 'border-border hover:bg-slate-50/80'
                          }`}
                        >
                          <input
                            type="radio"
                            name="colorPalette"
                            className="sr-only"
                            checked={palette === p}
                            onChange={() => setPalette(p)}
                          />
                          <span className="flex gap-1.5">
                            <span
                              className="h-8 w-8 rounded-lg border border-border shadow-sm"
                              style={{ backgroundColor: tokens.primary }}
                            />
                            <span
                              className="h-8 flex-1 rounded-lg border border-border"
                              style={{ backgroundColor: tokens.primarySoft }}
                            />
                          </span>
                          <span className="mt-2 text-sm font-semibold text-ink">
                            {t(`adminShop.palette.${p}`)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <Button type="submit" disabled={displaySaving}>
                  {displaySaving ? t('common.saving') : t('common.saveChanges')}
                </Button>
              </form>
            </Card>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-semibold text-ink">{t('adminShop.notificationsTitle')}</h2>
            <p className="mb-4 text-sm text-muted">{t('adminShop.notificationsDesc')}</p>
            <Card>
              <form onSubmit={saveNotifications} className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-ink">{t('adminShop.smtpTitle')}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>{t('adminShop.smtpHost')}</Label>
                      <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t('adminShop.smtpPort')}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={65535}
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-400"
                          checked={smtpSecure}
                          onChange={(e) => setSmtpSecure(e.target.checked)}
                        />
                        {t('adminShop.smtpSecure')}
                      </label>
                    </div>
                    <div>
                      <Label>{t('adminShop.smtpUser')}</Label>
                      <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
                    </div>
                    <div>
                      <Label>{t('adminShop.smtpPassword')}</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={smtpPassword}
                        placeholder={
                          notifications?.smtp.passwordConfigured
                            ? t('adminShop.smtpPasswordPlaceholder')
                            : undefined
                        }
                        onChange={(e) => setSmtpPassword(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>{t('adminShop.emailFrom')}</Label>
                      <Input
                        type="email"
                        value={emailFrom}
                        onChange={(e) => setEmailFrom(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-ink">{t('adminShop.twilioTitle')}</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>{t('adminShop.twilioAccountSid')}</Label>
                      <Input
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{t('adminShop.twilioFromNumber')}</Label>
                      <Input
                        value={twilioFromNumber}
                        onChange={(e) => setTwilioFromNumber(e.target.value)}
                        placeholder="+351912345678"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>{t('adminShop.twilioAuthToken')}</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={twilioAuthToken}
                        placeholder={
                          notifications?.twilio.authTokenConfigured
                            ? t('adminShop.twilioAuthTokenPlaceholder')
                            : undefined
                        }
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {notifSaved && (
                  <p className="text-sm text-emerald-700">{t('adminShop.notificationsSaved')}</p>
                )}
                <Button type="submit" disabled={notifSaving}>
                  {notifSaving ? t('common.saving') : t('common.saveChanges')}
                </Button>
              </form>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
