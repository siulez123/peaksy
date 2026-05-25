import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { adminApi, formatMoney, productImageUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, SheetDialog } from '../../components/ui';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

type ProductRow = {
  id: string;
  name: string;
  variant: string;
  priceCents: number;
  imageUrl: string | null;
  active: boolean;
};

type FormState = { name: string; variant: string; price: string; active: boolean };

const emptyForm = (): FormState => ({ name: '', variant: '', price: '', active: true });

export function AdminProducts() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const { token } = useAuth();
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [newForm, setNewForm] = useState<FormState>(emptyForm);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editImage, setEditImage] = useState<File | null>(null);

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

  const parsePriceCents = (price: string): number | null => {
    const priceCents = Math.round(parseFloat(price.replace(',', '.')) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) return null;
    return priceCents;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const priceCents = parsePriceCents(newForm.price);
    if (priceCents === null) {
      setErr(t('adminProducts.invalidPrice'));
      return;
    }
    setAddSaving(true);
    setErr(null);
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
      setNewForm(emptyForm());
      setNewImage(null);
      setAddOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setAddSaving(false);
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditingId(null);
    setEditForm(emptyForm());
    setEditImage(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingId) return;
    const priceCents = parsePriceCents(editForm.price);
    if (priceCents === null) {
      setErr(t('adminProducts.invalidPrice'));
      return;
    }
    setEditSaving(true);
    setErr(null);
    try {
      if (editImage) {
        const fd = new FormData();
        fd.append('name', editForm.name.trim());
        fd.append('variant', editForm.variant.trim());
        fd.append('priceCents', String(priceCents));
        fd.append('active', String(editForm.active));
        fd.append('image', editImage);
        await adminApi.products.patch(token, slug, editingId, fd);
      } else {
        await adminApi.products.patch(token, slug, editingId, {
          name: editForm.name.trim(),
          variant: editForm.variant.trim(),
          priceCents,
          active: editForm.active,
        });
      }
      closeEdit();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setEditSaving(false);
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

  const startEdit = (p: ProductRow) => {
    setErr(null);
    setEditingId(p.id);
    setEditImage(null);
    setEditForm({
      name: p.name,
      variant: p.variant,
      price: (p.priceCents / 100).toFixed(2),
      active: p.active,
    });
  };

  const editingProduct = editingId ? items.find((x) => x.id === editingId) : undefined;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">{t('adminProducts.title')}</h1>
        <Button
          type="button"
          onClick={() => {
            setErr(null);
            setNewForm(emptyForm());
            setNewImage(null);
            setAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('adminProducts.add')}
        </Button>
      </div>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      {loading ? (
        <p className="text-stone-500">A carregar…</p>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <Card key={p.id}>
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
            </Card>
          ))}
        </div>
      )}

      <SheetDialog
        open={addOpen}
        onClose={() => !addSaving && setAddOpen(false)}
        title={t('adminProducts.newProduct')}
        titleId="admin-create-product-title"
        maxWidthClassName="max-w-lg"
        closeDisabled={addSaving}
      >
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
            <Label>Imagem (opcional)</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-800"
              onChange={(e) => setNewImage(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={addSaving}>
              {addSaving ? t('common.saving') : t('common.add')}
            </Button>
            <Button type="button" variant="secondary" disabled={addSaving} onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetDialog>

      <SheetDialog
        open={editingId !== null}
        onClose={closeEdit}
        title={t('adminProducts.editProduct')}
        titleId="admin-edit-product-title"
        maxWidthClassName="max-w-lg"
        closeDisabled={editSaving}
      >
        <form onSubmit={saveEdit} className="grid gap-3 sm:grid-cols-2">
          {editingProduct && productImageUrl(editingProduct.imageUrl) && !editImage && (
            <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/80 p-3">
              <img
                src={productImageUrl(editingProduct.imageUrl)!}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 object-cover"
              />
              <p className="text-sm text-stone-600">Imagem actual. Escolhe um ficheiro abaixo para substituir.</p>
            </div>
          )}
          <div>
            <Label>Nome</Label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Variante</Label>
            <Input
              value={editForm.variant}
              onChange={(e) => setEditForm((f) => ({ ...f, variant: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Preço (€)</Label>
            <Input
              placeholder="1.50"
              value={editForm.price}
              onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editForm.active}
                onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Ativo
            </label>
          </div>
          <div className="sm:col-span-2">
            <Label>Nova imagem (opcional)</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-800"
              onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={editSaving}>
              {editSaving ? t('common.saving') : t('common.saveChanges')}
            </Button>
            <Button type="button" variant="secondary" disabled={editSaving} onClick={closeEdit}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetDialog>
    </div>
  );
}
