import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, SectionTitle } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

type Settings = {
  allowOnlinePayment: boolean;
  allowInStorePayment: boolean;
};

export function AdminPayment() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!token || !slug) return;
    try {
      const data = await adminApi.paymentSettings.get(token, slug);
      setSettings(data);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
      setSettings(null);
    }
  }, [token, slug]);

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
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionTitle title={t('adminPayment.title')} description={t('adminPayment.subtitle')} />

      {err && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
      {saved && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-slate-50/80">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary-400"
                checked={settings.allowInStorePayment}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, allowInStorePayment: e.target.checked } : s
                  )
                }
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

            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
