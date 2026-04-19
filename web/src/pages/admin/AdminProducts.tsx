import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { adminApi, formatMoney, productImageUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';

export function AdminProducts() {
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [items, setItems] = useState<
    Array<{
      id: string;
      name: string;
      variant: string;
      priceCents: number;
      imageUrl: string | null;
      active: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', variant: '', price: '', active: true });
  const [newForm, setNewForm] = useState({ name: '', variant: '', price: '', active: true });
  const [newImage, setNewImage] = useState<File | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await adminApi.products.list(token, slug);
      setItems(list);
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

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const priceCents = Math.round(parseFloat(newForm.price.replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setErr('Preço inválido');
      return;
    }
    try {
      if (newImage) {
        const fd = new FormData();
        fd.append('name', newForm.name.trim());
        fd.append('variant', newForm.variant.trim());
        fd.append('priceCents', String(priceCents));
        fd.append('active', String(newForm.active));
        fd.append('image', newImage);
        await adminApi.products.create(token, slug, fd);
      } else {
        await adminApi.products.create(token, slug, {
          name: newForm.name.trim(),
          variant: newForm.variant.trim(),
          priceCents,
          active: newForm.active,
        });
      }
      setNewForm({ name: '', variant: '', price: '', active: true });
      setNewImage(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  const saveEdit = async (id: string) => {
    if (!token) return;
    const priceCents = Math.round(parseFloat(form.price.replace(',', '.')) * 100);
    try {
      if (editImage) {
        const fd = new FormData();
        fd.append('name', form.name.trim());
        fd.append('variant', form.variant.trim());
        fd.append('priceCents', String(priceCents));
        fd.append('active', String(form.active));
        fd.append('image', editImage);
        await adminApi.products.patch(token, slug, id, fd);
      } else {
        await adminApi.products.patch(token, slug, id, {
          name: form.name.trim(),
          variant: form.variant.trim(),
          priceCents,
          active: form.active,
        });
      }
      setEditing(null);
      setEditImage(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  const remove = async (id: string) => {
    if (!token || !confirm('Remover produto?')) return;
    try {
      await adminApi.products.remove(token, slug, id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  const startEdit = (p: (typeof items)[0]) => {
    setEditing(p.id);
    setEditImage(null);
    setForm({
      name: p.name,
      variant: p.variant,
      price: (p.priceCents / 100).toFixed(2),
      active: p.active,
    });
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Produtos</h1>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      {loading ? (
        <p className="text-stone-500">A carregar…</p>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <Card key={p.id}>
              {editing === p.id ? (
                <div className="space-y-3">
                  <div>
                    <Label>Nova imagem (opcional)</Label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-800"
                      onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Nome</Label>
                      <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Variante</Label>
                      <Input
                        value={form.variant}
                        onChange={(e) => setForm((f) => ({ ...f, variant: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Preço (€)</Label>
                      <Input
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.active}
                          onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                        />
                        Ativo
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void saveEdit(p.id)}>
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditing(null);
                        setEditImage(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    {productImageUrl(p.imageUrl) && (
                      <img
                        src={productImageUrl(p.imageUrl)!}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg border border-stone-200 bg-stone-50 object-cover"
                      />
                    )}
                    <div>
                    <p className="font-medium text-stone-900">
                      {p.name} <span className="text-stone-500">{p.variant}</span>
                    </p>
                    <p className="text-sm text-orange-700">{formatMoney(p.priceCents)}</p>
                    {!p.active && <span className="text-xs text-amber-700">Inativo</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => startEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="danger" onClick={() => void remove(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <h2 className="mb-4 font-semibold text-stone-900">Novo produto</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nome</Label>
            <Input
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Variante</Label>
            <Input
              value={newForm.variant}
              onChange={(e) => setNewForm((f) => ({ ...f, variant: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Preço (€)</Label>
            <Input
              placeholder="1.50"
              value={newForm.price}
              onChange={(e) => setNewForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newForm.active}
                onChange={(e) => setNewForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Ativo
            </label>
          </div>
          <div className="sm:col-span-2">
            <Label>Imagem</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-800"
              onChange={(e) => setNewImage(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
