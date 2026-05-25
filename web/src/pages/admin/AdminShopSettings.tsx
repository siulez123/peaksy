import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi, type ProductDisplayLayout } from '../../api';
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
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [rates, setRates] = useState<VatRateRow[]>([]);
  const [layout, setLayout] = useState<ProductDisplayLayout>('LARGE');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vatSaving, setVatSaving] = useState(false);
  const [displaySaving, setDisplaySaving] = useState(false);
  const [displaySaved, setDisplaySaved] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newRate, setNewRate] = useState('');

  const load = useCallback(async () => {
    if (!token || !slug) return;
    setLoading(true);
    try {
      const [vatList, display] = await Promise.all([
        adminApi.vatRates.list(token, slug),
        adminApi.shopDisplay.get(token, slug),
      ]);
      setRates(vatList);
      setLayout(display.productDisplayLayout);
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
      const data = await adminApi.shopDisplay.update(token, slug, { productDisplayLayout: layout });
      setLayout(data.productDisplayLayout);
      setDisplaySaved(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.genericError'));
    } finally {
      setDisplaySaving(false);
    }
  };

  const layoutLabel = (l: ProductDisplayLayout) => t(`adminShop.layout.${l}`);

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
                      <p className="font-medium text-ink">{r.label}</p>
                      <p className="text-sm text-muted">
                        {t('adminShop.vatPercent', { rate: r.ratePercent })}
                        {r.productCount > 0
                          ? ` · ${t('adminShop.vatProductCount', { count: r.productCount })}`
                          : ''}
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
                <Button type="submit" disabled={displaySaving}>
                  {displaySaving ? t('common.saving') : t('common.saveChanges')}
                </Button>
              </form>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
