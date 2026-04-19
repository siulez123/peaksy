import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { superApi, type SuperBakery } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, SheetDialog } from '../../components/ui';

type EditForm = {
  name: string;
  slug: string;
  domain: string;
  timezone: string;
  active: boolean;
  plan: 'STARTER' | 'PRO' | 'PREMIUM';
  addressLine: string;
  postalCode: string;
  locality: string;
  phone: string;
};

function bakeryToForm(b: SuperBakery): EditForm {
  return {
    name: b.name,
    slug: b.slug,
    domain: b.domain ?? '',
    timezone: b.timezone,
    active: b.active,
    plan: (['STARTER', 'PRO', 'PREMIUM'].includes(b.plan) ? b.plan : 'STARTER') as EditForm['plan'],
    addressLine: b.addressLine ?? '',
    postalCode: b.postalCode ?? '',
    locality: b.locality ?? '',
    phone: b.phone ?? '',
  };
}

export function SuperBakeries() {
  const { token } = useAuth();
  const [items, setItems] = useState<SuperBakery[]>([]);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    addressLine: '',
    postalCode: '',
    locality: '',
    phone: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SuperBakery | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const list = await superApi.bakeries.list(token);
      setItems(list);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) setEditing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, saving]);

  useEffect(() => {
    if (!editing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editing]);

  const openEdit = (b: SuperBakery) => {
    setEditing(b);
    setEditForm(bakeryToForm(b));
    setErr(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editing || !editForm) return;
    setSaving(true);
    setErr(null);
    try {
      await superApi.bakeries.patch(token, editing.id, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        domain: editForm.domain.trim() ? editForm.domain.trim() : null,
        timezone: editForm.timezone.trim() || 'Europe/Lisbon',
        active: editForm.active,
        plan: editForm.plan,
        addressLine: editForm.addressLine.trim(),
        postalCode: editForm.postalCode.trim(),
        locality: editForm.locality.trim(),
        phone: editForm.phone.trim(),
      });
      setEditing(null);
      setEditForm(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setErr(null);
    try {
      await superApi.bakeries.create(token, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        addressLine: form.addressLine.trim(),
        postalCode: form.postalCode.trim(),
        locality: form.locality.trim(),
        phone: form.phone.trim(),
      });
      setForm({
        name: '',
        slug: '',
        addressLine: '',
        postalCode: '',
        locality: '',
        phone: '',
      });
      setCreateOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (id: string, active: boolean) => {
    if (!token) return;
    try {
      await superApi.bakeries.patch(token, id, { active: !active });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  const remove = async (id: string) => {
    if (!token || !confirm('Apagar padaria?')) return;
    try {
      await superApi.bakeries.remove(token, id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Padarias</h1>
        <Button
          type="button"
          onClick={() => {
            setErr(null);
            setForm({
              name: '',
              slug: '',
              addressLine: '',
              postalCode: '',
              locality: '',
              phone: '',
            });
            setCreateOpen(true);
          }}
        >
          Adicionar padaria
        </Button>
      </div>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="space-y-3">
        {items.map((b) => (
          <Card key={b.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{b.name}</p>
                <p className="text-sm text-stone-500">
                  {b.slug} · {b.plan} · utilizadores {b._count.users} · produtos {b._count.products} · pedidos{' '}
                  {b._count.orders}
                </p>
                {!b.active && <span className="text-xs text-amber-700">Inativa</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="text-sm" onClick={() => openEdit(b)}>
                  Editar
                </Button>
                <Button type="button" variant="secondary" className="text-sm" onClick={() => void toggle(b.id, b.active)}>
                  {b.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button type="button" variant="danger" className="text-sm" onClick={() => void remove(b.id)}>
                  Apagar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SheetDialog
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="Nova padaria"
        titleId="super-create-bakery-title"
        maxWidthClassName="max-w-lg"
        closeDisabled={creating}
      >
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="sm:col-span-2">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="minha-padaria"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Morada</Label>
            <Input
              value={form.addressLine}
              onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
              placeholder="Rua, número, andar…"
              required
            />
          </div>
          <div>
            <Label>Código postal</Label>
            <Input
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
              placeholder="1000-001"
              required
            />
          </div>
          <div>
            <Label>Localidade</Label>
            <Input
              value={form.locality}
              onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))}
              placeholder="Lisboa"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Telefone</Label>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+351 912 345 678"
              required
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? 'A criar…' : 'Criar padaria'}
            </Button>
            <Button type="button" variant="secondary" disabled={creating} onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetDialog>

      {editing && editForm && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="super-edit-bakery-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => !saving && setEditing(null)}
            aria-label="Fechar"
          />
          <div
            className="relative max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-200 bg-white shadow-2xl sm:rounded-2xl"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3 sm:px-6">
              <h2 id="super-edit-bakery-title" className="text-lg font-semibold text-stone-900">
                Editar padaria
              </h2>
              <button
                type="button"
                className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
                onClick={() => !saving && setEditing(null)}
                disabled={saving}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4 px-4 py-4 sm:px-6">
              <p className="text-sm text-stone-600">
                <span className="font-medium text-stone-800">{editing.name}</span>
                <span className="text-stone-500"> · {editing.slug}</span>
              </p>

              <div>
                <Label>Nome</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  required
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={editForm.slug}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') } : f))
                  }
                  required
                />
              </div>
              <div>
                <Label>Domínio personalizado (opcional)</Label>
                <Input
                  value={editForm.domain}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, domain: e.target.value } : f))}
                  placeholder="loja.exemplo.pt"
                />
                <p className="mt-1 text-xs text-stone-500">Vazio remove o domínio.</p>
              </div>
              <div>
                <Label>Fuso horário</Label>
                <Input
                  value={editForm.timezone}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, timezone: e.target.value } : f))}
                  placeholder="Europe/Lisbon"
                  required
                />
              </div>
              <div>
                <Label>Plano</Label>
                <select
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={editForm.plan}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, plan: e.target.value as EditForm['plan'] } : f
                    )
                  }
                >
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-400"
                  checked={editForm.active}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, active: e.target.checked } : f))}
                />
                <label htmlFor="edit-active" className="text-sm text-stone-700">
                  Padaria ativa
                </label>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Contacto público</p>
                <div className="space-y-3">
                  <div>
                    <Label>Morada</Label>
                    <Input
                      value={editForm.addressLine}
                      onChange={(e) => setEditForm((f) => (f ? { ...f, addressLine: e.target.value } : f))}
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Código postal</Label>
                      <Input
                        value={editForm.postalCode}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, postalCode: e.target.value } : f))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Localidade</Label>
                      <Input
                        value={editForm.locality}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, locality: e.target.value } : f))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'A guardar…' : 'Guardar alterações'}
                </Button>
                <Button type="button" variant="secondary" disabled={saving} onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
