import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, SheetDialog } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { isValidHhHalfHour, normalizeTimeToHalfHourSlot, parseTimeToMinutes } from '../../lib/timeOfDay';
import { useI18n } from '../../i18n/context';

/** Amanhã (data local do browser) em YYYY-MM-DD — alinhado com validação no servidor. */
function tomorrowLocalYmd(): string {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 1);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type DateRuleRow = { pickupDate: string; orderDeadline: string };

type DayRow = {
  id: string;
  pickupDate: string;
  pickupEndDate: string;
  ordersOpenAt: string | null;
  pickupTimeMin: string;
  pickupTimeMax: string;
  active: boolean;
  dayCapTotal: number | null;
  _count: { orders: number };
  pickupDateRules: Array<{ id: string; pickupDate: string; orderDeadline: string }>;
  productCaps: Array<{ id: string; cap: number; productId: string; product: { name: string; variant: string } }>;
};

type CapRow = { productId: string; cap: string };

const emptyForm = () => ({
  ordersOpenAt: '',
  pickupTimeMin: '08:00',
  pickupTimeMax: '20:00',
  dayCapTotal: '',
  dateRules: [{ pickupDate: '', orderDeadline: '' }] as DateRuleRow[],
});

export function AdminDays() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [days, setDays] = useState<DayRow[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; variant: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [capRows, setCapRows] = useState<CapRow[]>([]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        adminApi.days.list(token, slug),
        adminApi.products.list(token, slug),
      ]);
      setDays(d as DayRow[]);
      setProducts(p.map((x) => ({ id: x.id, name: x.name, variant: x.variant })));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token, slug]);

  useEffect(() => {
    if (!successMsg) return;
    const t = window.setTimeout(() => setSuccessMsg(null), 6000);
    return () => window.clearTimeout(t);
  }, [successMsg]);

  const resetFormFields = () => {
    setEditingId(null);
    setForm(emptyForm());
    setCapRows([]);
  };

  const closeDayModal = () => {
    setDayModalOpen(false);
    resetFormFields();
  };

  const openCreateModal = () => {
    setErr(null);
    setSuccessMsg(null);
    resetFormFields();
    setDayModalOpen(true);
  };

  const buildProductCaps = (): Array<{ productId: string; cap: number }> | null => {
    for (const r of capRows) {
      const pid = r.productId.trim();
      const capN = parseInt(r.cap, 10);
      const hasCap = r.cap.trim() !== '' && Number.isFinite(capN) && capN > 0;
      if (pid && !hasCap) {
        setErr(t('adminDays.maxQtyRequired'));
        return null;
      }
      if (!pid && r.cap.trim()) {
        setErr(t('adminDays.chooseProduct'));
        return null;
      }
    }
    const caps = capRows
      .map((r) => ({
        productId: r.productId.trim(),
        cap: parseInt(r.cap, 10),
      }))
      .filter((r) => r.productId && Number.isFinite(r.cap) && r.cap > 0);
    const ids = new Set(caps.map((c) => c.productId));
    if (ids.size !== caps.length) {
      setErr(t('adminDays.duplicateProduct'));
      return null;
    }
    return caps;
  };

  const validateForm = (isCreate: boolean): boolean => {
    const tMin = parseTimeToMinutes(form.pickupTimeMin);
    const tMax = parseTimeToMinutes(form.pickupTimeMax);
    if (tMin === null || tMax === null) {
      setErr(t('adminDays.invalidPickupHours'));
      return false;
    }
    if (!isValidHhHalfHour(form.pickupTimeMin) || !isValidHhHalfHour(form.pickupTimeMax)) {
      setErr(t('adminDays.halfHourOnly'));
      return false;
    }
    if (tMin > tMax) {
      setErr(t('adminDays.minBeforeMax'));
      return false;
    }

    const rules = form.dateRules.filter((r) => r.pickupDate.trim() || r.orderDeadline.trim());
    if (rules.length === 0) {
      setErr(t('adminDays.minPickupDate'));
      return false;
    }
    for (const r of rules) {
      if (!r.pickupDate.trim() || !r.orderDeadline.trim()) {
        setErr(t('adminDays.fillDeadline'));
        return false;
      }
      const dl = new Date(r.orderDeadline);
      if (Number.isNaN(dl.getTime())) {
        setErr(t('adminDays.invalidDeadline'));
        return false;
      }
    }
    const dates = rules.map((r) => r.pickupDate.trim());
    if (new Set(dates).size !== dates.length) {
      setErr(t('adminDays.duplicatePickupDate'));
      return false;
    }

    const minPickup = [...dates].sort()[0];
    if (isCreate && minPickup < tomorrowLocalYmd()) {
      setErr(t('adminDays.pickupFuture'));
      return false;
    }

    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setSuccessMsg(null);
    const isCreate = !editingId;
    if (!validateForm(isCreate)) return;
    const caps = buildProductCaps();
    if (caps === null) return;

    const pickupDates = form.dateRules
      .filter((r) => r.pickupDate.trim() && r.orderDeadline.trim())
      .map((r) => ({
        pickupDate: r.pickupDate.trim(),
        orderDeadline: new Date(r.orderDeadline).toISOString(),
      }));

    setSaving(true);
    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          pickupDates,
          pickupTimeMin: form.pickupTimeMin,
          pickupTimeMax: form.pickupTimeMax,
          productCaps: caps,
        };
        body.ordersOpenAt = form.ordersOpenAt.trim() ? new Date(form.ordersOpenAt).toISOString() : null;
        body.dayCapTotal = form.dayCapTotal.trim() ? parseInt(form.dayCapTotal, 10) : null;
        await adminApi.days.patch(token, slug, editingId, body);
        setDayModalOpen(false);
        resetFormFields();
        setSuccessMsg(t('adminDays.saved'));
      } else {
        const body: Record<string, unknown> = {
          pickupDates,
          pickupTimeMin: form.pickupTimeMin,
          pickupTimeMax: form.pickupTimeMax,
          active: true,
          productCaps: caps,
        };
        body.ordersOpenAt = form.ordersOpenAt.trim() ? new Date(form.ordersOpenAt).toISOString() : null;
        if (form.dayCapTotal.trim()) body.dayCapTotal = parseInt(form.dayCapTotal, 10);
        await adminApi.days.create(token, slug, body);
        setDayModalOpen(false);
        resetFormFields();
        setSuccessMsg(t('adminDays.created'));
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('adminDays.saveError'));
      setSuccessMsg(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (d: DayRow) => {
    setEditingId(d.id);
    setForm({
      ordersOpenAt: d.ordersOpenAt ? toDatetimeLocalValue(d.ordersOpenAt) : '',
      pickupTimeMin: normalizeTimeToHalfHourSlot(d.pickupTimeMin) || d.pickupTimeMin,
      pickupTimeMax: normalizeTimeToHalfHourSlot(d.pickupTimeMax) || d.pickupTimeMax,
      dayCapTotal: d.dayCapTotal != null ? String(d.dayCapTotal) : '',
      dateRules:
        d.pickupDateRules.length > 0
          ? d.pickupDateRules.map((r) => ({
              pickupDate: r.pickupDate,
              orderDeadline: toDatetimeLocalValue(r.orderDeadline),
            }))
          : [{ pickupDate: '', orderDeadline: '' }],
    });
    setCapRows(d.productCaps.map((c) => ({ productId: c.productId, cap: String(c.cap) })));
    setErr(null);
    setSuccessMsg(null);
    setDayModalOpen(true);
  };

  const delDay = async (id: string) => {
    if (!token || !confirm(t('adminDays.confirmDelete'))) return;
    setErr(null);
    setSuccessMsg(null);
    try {
      await adminApi.days.remove(token, slug, id);
      if (editingId === id) closeDayModal();
      setSuccessMsg(t('adminDays.deleted'));
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('adminDays.deleteError'));
      setSuccessMsg(null);
    }
  };

  const addDateRule = () =>
    setForm((f) => ({ ...f, dateRules: [...f.dateRules, { pickupDate: '', orderDeadline: '' }] }));
  const removeDateRule = (i: number) =>
    setForm((f) => ({
      ...f,
      dateRules: f.dateRules.length > 1 ? f.dateRules.filter((_, j) => j !== i) : f.dateRules,
    }));

  const addCapRow = () => setCapRows((rows) => [...rows, { productId: '', cap: '' }]);
  const removeCapRow = (i: number) => setCapRows((rows) => rows.filter((_, j) => j !== i));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">{t('adminDays.title')}</h1>
        <Button type="button" onClick={openCreateModal}>
          <Plus className="h-4 w-4" aria-hidden />
          {t('adminDays.add')}
        </Button>
      </div>
      {successMsg && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {successMsg}
        </p>
      )}
      {err && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>
      )}
      {loading ? (
        <p className="text-stone-500">A carregar…</p>
      ) : (
        <div className="space-y-6">
          {days.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-stone-900">
                    {d.pickupEndDate !== d.pickupDate
                      ? `${d.pickupDate} → ${d.pickupEndDate}`
                      : d.pickupDate}
                  </p>
                  {d.ordersOpenAt && (
                    <p className="text-sm text-stone-600">
                      Encomendas abertas a partir de:{' '}
                      {new Date(d.ordersOpenAt).toLocaleString('pt-PT')}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1 text-sm text-stone-600">
                    {d.pickupDateRules.map((r) => (
                      <li key={r.id}>
                        <span className="font-medium text-stone-800">{r.pickupDate}</span>
                        {' · limite '}
                        {new Date(r.orderDeadline).toLocaleString('pt-PT')}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-stone-500">
                    Levantamento: {d.pickupTimeMin} – {d.pickupTimeMax}
                  </p>
                  {d.dayCapTotal != null && (
                    <p className="text-xs text-stone-500">
                      Máx. encomendas pagas no período: {d.dayCapTotal}
                    </p>
                  )}
                  {d._count.orders > 0 && (
                    <p className="text-xs text-amber-800">
                      {t('adminDays.ordersBlockDelete', { count: d._count.orders })}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" className="text-sm" onClick={() => startEdit(d)}>
                    Editar
                  </Button>
                  {d._count.orders === 0 ? (
                    <Button type="button" variant="danger" className="text-sm" onClick={() => void delDay(d.id)}>
                      Apagar
                    </Button>
                  ) : null}
                </div>
              </div>
              {d.productCaps.length > 0 && (
                <ul className="mt-3 text-sm text-stone-600">
                  {d.productCaps.map((c) => (
                    <li key={c.id}>
                      {c.product.name} {c.product.variant}: máx. {c.cap} (por dia de levantamento)
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <SheetDialog
        open={dayModalOpen}
        onClose={() => !saving && closeDayModal()}
        title={editingId ? t('adminDays.editPeriod') : t('adminDays.newPeriod')}
        titleId="admin-day-modal-title"
        maxWidthClassName="max-w-2xl"
        closeDisabled={saving}
      >
        {editingId && (
          <p className="mb-4 text-sm text-stone-600">
            Ajusta datas, limites por dia, horários e limites por produto. Guarda para aplicar.
          </p>
        )}
        <form onSubmit={submit} className="space-y-6">
          <div>
            <Label>Encomendas abertas a partir de (opcional)</Label>
            <Input
              type="datetime-local"
              value={form.ordersOpenAt}
              onChange={(e) => setForm((f) => ({ ...f, ordersOpenAt: e.target.value }))}
            />
            <p className="mt-1 text-xs text-stone-500">
              Se definires, os clientes só podem encomendar a partir desta data/hora. O limite por dia de
              levantamento aplica-se na mesma.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>Datas de levantamento e limite de encomenda por dia</Label>
              <Button type="button" variant="secondary" className="!py-1 text-xs" onClick={addDateRule}>
                + Dia
              </Button>
            </div>
            <p className="mb-3 text-xs text-stone-500">
              Para cada dia em que se levantam encomendas, define até quando podem ser feitas (normalmente o dia
              anterior, ex. levantamento 24/12 → limite 23/12 às 17h).
            </p>
            <div className="space-y-3">
              {form.dateRules.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-stone-50/50 p-3 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <Label>Data de levantamento</Label>
                    <Input
                      type="date"
                      min={editingId ? undefined : tomorrowLocalYmd()}
                      value={row.pickupDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          dateRules: f.dateRules.map((r, j) =>
                            j === i ? { ...r, pickupDate: e.target.value } : r
                          ),
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="min-w-0 flex-[1.2]">
                    <Label>Limite de encomenda (data e hora local)</Label>
                    <Input
                      type="datetime-local"
                      value={row.orderDeadline}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          dateRules: f.dateRules.map((r, j) =>
                            j === i ? { ...r, orderDeadline: e.target.value } : r
                          ),
                        }))
                      }
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={form.dateRules.length <= 1}
                    onClick={() => removeDateRule(i)}
                    aria-label="Remover dia"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Primeira hora de levantamento</Label>
              <Input
                type="time"
                step={1800}
                value={form.pickupTimeMin}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pickupTimeMin: normalizeTimeToHalfHourSlot(e.target.value),
                  }))
                }
                required
              />
              <p className="mt-1 text-xs text-stone-500">Horas cheias ou meias (ex.: 07:30, 08:00).</p>
            </div>
            <div>
              <Label>Última hora de levantamento (máx.)</Label>
              <Input
                type="time"
                step={1800}
                value={form.pickupTimeMax}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    pickupTimeMax: normalizeTimeToHalfHourSlot(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Máx. encomendas pagas no período (opcional)</Label>
              <Input
                placeholder="ex. 200"
                value={form.dayCapTotal}
                onChange={(e) => setForm((f) => ({ ...f, dayCapTotal: e.target.value }))}
              />
              <p className="mt-1 text-xs text-stone-500">
                Limite global de encomendas pagas para este período (todas as datas de levantamento).
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>Limite por produto por dia de levantamento (opcional)</Label>
              <Button type="button" variant="secondary" className="!py-1 text-xs" onClick={addCapRow}>
                + Linha
              </Button>
            </div>
            {products.length === 0 && (
              <p className="mb-2 text-sm text-amber-800">Cria produtos primeiro para definir limites.</p>
            )}
            <div className="space-y-2">
              {capRows.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <select
                      className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
                      value={row.productId}
                      onChange={(e) =>
                        setCapRows((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, productId: e.target.value } : r))
                        )
                      }
                    >
                      <option value="">— Produto —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.variant}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-28">
                    <Input
                      inputMode="numeric"
                      placeholder="Máx."
                      value={row.cap}
                      onChange={(e) =>
                        setCapRows((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, cap: e.target.value } : r))
                        )
                      }
                    />
                  </div>
                  <Button type="button" variant="secondary" className="!py-2 text-sm" onClick={() => removeCapRow(i)}>
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t('common.saving') : editingId ? t('common.saveChanges') : t('common.create')}
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => closeDayModal()}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetDialog>
    </div>
  );
}
