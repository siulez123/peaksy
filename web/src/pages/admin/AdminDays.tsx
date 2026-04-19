import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { isValidHhRoundHour, normalizeTimeToHourSlot, parseTimeToMinutes } from '../../lib/timeOfDay';

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

type DayRow = {
  id: string;
  pickupDate: string;
  pickupEndDate: string;
  orderDeadline: string;
  pickupTimeMin: string;
  pickupTimeMax: string;
  active: boolean;
  dayCapTotal: number | null;
  _count: { orders: number };
  productCaps: Array<{ id: string; cap: number; productId: string; product: { name: string; variant: string } }>;
};

type CapRow = { productId: string; cap: string };

const emptyForm = () => ({
  pickupDate: '',
  pickupEndDate: '',
  orderDeadline: '',
  pickupTimeMin: '08:00',
  pickupTimeMax: '20:00',
  dayCapTotal: '',
});

export function AdminDays() {
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [days, setDays] = useState<DayRow[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; variant: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const resetCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setCapRows([]);
    setSuccessMsg(null);
  };

  /** Lista de caps ou `null` se a validação falhar (linhas incompletas ou produto repetido). */
  const buildProductCaps = (): Array<{ productId: string; cap: number }> | null => {
    for (const r of capRows) {
      const pid = r.productId.trim();
      const capN = parseInt(r.cap, 10);
      const hasCap = r.cap.trim() !== '' && Number.isFinite(capN) && capN > 0;
      if (pid && !hasCap) {
        setErr('Indica a quantidade máxima para cada produto escolhido.');
        return null;
      }
      if (!pid && r.cap.trim()) {
        setErr('Escolhe o produto em cada linha onde indicaste quantidade.');
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
      setErr('Cada produto só pode ter uma linha de limite.');
      return null;
    }
    return caps;
  };

  const validatePeriod = (): boolean => {
    const deadline = new Date(form.orderDeadline);
    if (Number.isNaN(deadline.getTime())) {
      setErr('Data limite inválida');
      return false;
    }
    const minPickup = tomorrowLocalYmd();
    if (form.pickupDate < minPickup) {
      setErr('A data de levantamento tem de ser no futuro (mínimo: amanhã).');
      return false;
    }
    const dlY = deadline.getFullYear();
    const dlM = String(deadline.getMonth() + 1).padStart(2, '0');
    const dlD = String(deadline.getDate()).padStart(2, '0');
    const deadlineDayStr = `${dlY}-${dlM}-${dlD}`;
    if (deadlineDayStr < form.pickupDate) {
      setErr('O limite de encomenda tem de ser no mesmo dia ou depois do dia de levantamento.');
      return false;
    }
    const endStr = form.pickupEndDate.trim() || form.pickupDate;
    if (endStr < form.pickupDate) {
      setErr('A data de fim de levantamento não pode ser anterior à data de início.');
      return false;
    }
    const tMin = parseTimeToMinutes(form.pickupTimeMin);
    const tMax = parseTimeToMinutes(form.pickupTimeMax);
    if (tMin === null || tMax === null) {
      setErr('Indica horas de levantamento válidas.');
      return false;
    }
    if (!isValidHhRoundHour(form.pickupTimeMin) || !isValidHhRoundHour(form.pickupTimeMax)) {
      setErr('As horas têm de ser horas cheias (ex.: 08:00, 14:00), sem minutos intermédios.');
      return false;
    }
    if (tMin > tMax) {
      setErr('A primeira hora de levantamento tem de ser anterior ou igual à última.');
      return false;
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErr(null);
    setSuccessMsg(null);
    if (!validatePeriod()) return;
    const caps = buildProductCaps();
    if (caps === null) return;
    const deadline = new Date(form.orderDeadline);

    setSaving(true);
    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          pickupDate: form.pickupDate,
          orderDeadline: deadline.toISOString(),
          pickupTimeMin: form.pickupTimeMin,
          pickupTimeMax: form.pickupTimeMax,
          productCaps: caps,
        };
        if (form.pickupEndDate.trim()) body.pickupEndDate = form.pickupEndDate.trim();
        else body.pickupEndDate = form.pickupDate;
        body.dayCapTotal = form.dayCapTotal ? parseInt(form.dayCapTotal, 10) : null;
        await adminApi.days.patch(token, slug, editingId, body);
        resetCreateForm();
        setSuccessMsg('Alterações guardadas com sucesso.');
      } else {
        const body: Record<string, unknown> = {
          pickupDate: form.pickupDate,
          orderDeadline: deadline.toISOString(),
          pickupTimeMin: form.pickupTimeMin,
          pickupTimeMax: form.pickupTimeMax,
          active: true,
          productCaps: caps,
        };
        if (form.pickupEndDate.trim()) body.pickupEndDate = form.pickupEndDate.trim();
        if (form.dayCapTotal) body.dayCapTotal = parseInt(form.dayCapTotal, 10);
        await adminApi.days.create(token, slug, body);
        resetCreateForm();
        setSuccessMsg('Período criado com sucesso.');
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao guardar. Tenta novamente.');
      setSuccessMsg(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (d: DayRow) => {
    setEditingId(d.id);
    setForm({
      pickupDate: d.pickupDate,
      pickupEndDate: d.pickupEndDate !== d.pickupDate ? d.pickupEndDate : '',
      orderDeadline: toDatetimeLocalValue(d.orderDeadline),
      pickupTimeMin: normalizeTimeToHourSlot(d.pickupTimeMin) || d.pickupTimeMin,
      pickupTimeMax: normalizeTimeToHourSlot(d.pickupTimeMax) || d.pickupTimeMax,
      dayCapTotal: d.dayCapTotal != null ? String(d.dayCapTotal) : '',
    });
    setCapRows(d.productCaps.map((c) => ({ productId: c.productId, cap: String(c.cap) })));
    setErr(null);
    setSuccessMsg(null);
  };

  const delDay = async (id: string) => {
    if (!token || !confirm('Apagar este período de levantamento?')) return;
    setErr(null);
    setSuccessMsg(null);
    try {
      await adminApi.days.remove(token, slug, id);
      if (editingId === id) resetCreateForm();
      setSuccessMsg('Período apagado.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao apagar.');
      setSuccessMsg(null);
    }
  };

  const addCapRow = () => setCapRows((rows) => [...rows, { productId: '', cap: '' }]);
  const removeCapRow = (i: number) => setCapRows((rows) => rows.filter((_, j) => j !== i));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Dias de levantamento</h1>
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
                  <p className="text-sm text-stone-500">
                    Limite: {new Date(d.orderDeadline).toLocaleString('pt-PT')}
                  </p>
                  <p className="text-sm text-stone-500">
                    Levantamento: {d.pickupTimeMin} – {d.pickupTimeMax}
                  </p>
                  {d.dayCapTotal != null && (
                    <p className="text-xs text-stone-500">Cap. total período: {d.dayCapTotal}</p>
                  )}
                  {d._count.orders > 0 && (
                    <p className="text-xs text-amber-800">{d._count.orders} pedido(s) — não pode apagar</p>
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
                      {c.product.name} {c.product.variant}: máx. {c.cap}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <h2 className="mb-4 font-semibold text-stone-900">
          {editingId ? 'Editar período de levantamento' : 'Novo período de levantamento'}
        </h2>
        {editingId && (
          <p className="mb-4 text-sm text-stone-600">
            Ajusta datas, limite de encomenda e limites por produto. Guarda para aplicar.
          </p>
        )}
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Primeiro dia de levantamento</Label>
              <Input
                type="date"
                min={tomorrowLocalYmd()}
                value={form.pickupDate}
                onChange={(e) => setForm((f) => ({ ...f, pickupDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Último dia de levantamento (opcional)</Label>
              <Input
                type="date"
                min={form.pickupDate || tomorrowLocalYmd()}
                value={form.pickupEndDate}
                onChange={(e) => setForm((f) => ({ ...f, pickupEndDate: e.target.value }))}
                placeholder="Igual ao primeiro se vazio"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Primeira hora de levantamento</Label>
                <Input
                  type="time"
                  step={3600}
                  value={form.pickupTimeMin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pickupTimeMin: normalizeTimeToHourSlot(e.target.value),
                    }))
                  }
                  required
                />
                <p className="mt-1 text-xs text-stone-500">Apenas horas cheias (08:00, 09:00…).</p>
              </div>
              <div>
                <Label>Última hora de levantamento (máx.)</Label>
                <Input
                  type="time"
                  step={3600}
                  value={form.pickupTimeMax}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pickupTimeMax: normalizeTimeToHourSlot(e.target.value),
                    }))
                  }
                  required
                />
                <p className="mt-1 text-xs text-stone-500">Apenas horas cheias.</p>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Limite encomenda (data e hora local)</Label>
              <Input
                type="datetime-local"
                value={form.orderDeadline}
                onChange={(e) => setForm((f) => ({ ...f, orderDeadline: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Cap. total período (opcional)</Label>
              <Input
                placeholder="ex. 500"
                value={form.dayCapTotal}
                onChange={(e) => setForm((f) => ({ ...f, dayCapTotal: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>Limite por produto (opcional)</Label>
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
              {saving ? 'A guardar…' : editingId ? 'Guardar alterações' : 'Criar período'}
            </Button>
            {editingId ? (
              <Button type="button" variant="secondary" disabled={saving} onClick={() => resetCreateForm()}>
                Cancelar edição
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
