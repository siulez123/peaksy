import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { superApi, type SuperBakery, type SuperUser, type UserRole } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, SheetDialog } from '../../components/ui';

type EditForm = {
  email: string;
  password: string;
  role: UserRole;
  bakeryId: string;
};

function userToForm(u: SuperUser): EditForm {
  return {
    email: u.email,
    password: '',
    role: u.role,
    bakeryId: u.bakeryId ?? '',
  };
}

export function SuperUsers() {
  const { token } = useAuth();
  const [items, setItems] = useState<SuperUser[]>([]);
  const [bakeries, setBakeries] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'BAKERY_ADMIN' as UserRole,
    bakeryId: '',
  });
  const [err, setErr] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SuperUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const [users, b] = await Promise.all([superApi.users.list(token), superApi.bakeries.list(token)]);
      setItems(users);
      setBakeries(b.map((x: SuperBakery) => ({ id: x.id, name: x.name, slug: x.slug })));
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

  const openEdit = (u: SuperUser) => {
    setEditing(u);
    setEditForm(userToForm(u));
    setErr(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editing || !editForm) return;
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        email: editForm.email.trim(),
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        body.password = editForm.password;
      }
      if (editForm.role === 'BAKERY_ADMIN') {
        if (!editForm.bakeryId) {
          setErr('Seleciona uma padaria para admin de padaria.');
          setSaving(false);
          return;
        }
        body.bakeryId = editForm.bakeryId;
      } else {
        body.bakeryId = null;
      }
      await superApi.users.patch(token, editing.id, body);
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
      await superApi.users.create(token, {
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        bakeryId: form.role === 'BAKERY_ADMIN' ? form.bakeryId : undefined,
      });
      setForm({ email: '', password: '', role: 'BAKERY_ADMIN', bakeryId: '' });
      setCreateOpen(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    if (!token || !confirm('Apagar utilizador?')) return;
    try {
      await superApi.users.remove(token, id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Utilizadores</h1>
        <Button
          type="button"
          onClick={() => {
            setErr(null);
            setForm({ email: '', password: '', role: 'BAKERY_ADMIN', bakeryId: '' });
            setCreateOpen(true);
          }}
        >
          Adicionar utilizador
        </Button>
      </div>
      {err && <p className="mb-4 text-sm text-red-600">{err}</p>}
      <div className="space-y-3">
        {items.map((u) => (
          <Card key={u.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-stone-900">{u.email}</p>
                <p className="text-sm text-stone-500">
                  {u.role}
                  {u.bakery && ` · ${u.bakery.name}`}
                </p>
                <p className="text-xs text-stone-400">
                  Criado em {new Date(u.createdAt).toLocaleString('pt-PT')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="text-sm" onClick={() => openEdit(u)}>
                  Editar
                </Button>
                <Button type="button" variant="danger" className="text-sm" onClick={() => void remove(u.id)}>
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
        title="Novo utilizador"
        titleId="super-create-user-title"
        maxWidthClassName="max-w-lg"
        closeDisabled={creating}
      >
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label>Palavra-passe</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </div>
          <div>
            <Label>Função</Label>
            <select
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="BAKERY_ADMIN">Admin padaria</option>
              <option value="SUPER_ADMIN">Super admin</option>
            </select>
          </div>
          {form.role === 'BAKERY_ADMIN' && (
            <div>
              <Label>Padaria</Label>
              <select
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                value={form.bakeryId}
                onChange={(e) => setForm((f) => ({ ...f, bakeryId: e.target.value }))}
                required
              >
                <option value="">—</option>
                {bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.slug})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? 'A criar…' : 'Criar utilizador'}
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
          aria-labelledby="super-edit-user-title"
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
              <h2 id="super-edit-user-title" className="text-lg font-semibold text-stone-900">
                Editar utilizador
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
              <p className="text-xs text-stone-500">
                ID: <span className="font-mono text-stone-600">{editing.id}</span>
              </p>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, email: e.target.value } : f))}
                  required
                />
              </div>
              <div>
                <Label>Nova palavra-passe (opcional)</Label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, password: e.target.value } : f))}
                  placeholder="Deixar em branco para não alterar"
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-stone-500">Mínimo 8 caracteres se preencheres.</p>
              </div>
              <div>
                <Label>Função</Label>
                <select
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, role: e.target.value as UserRole } : f))}
                >
                  <option value="BAKERY_ADMIN">Admin padaria</option>
                  <option value="SUPER_ADMIN">Super admin</option>
                </select>
              </div>
              {editForm.role === 'BAKERY_ADMIN' && (
                <div>
                  <Label>Padaria</Label>
                  <select
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={editForm.bakeryId}
                    onChange={(e) => setEditForm((f) => (f ? { ...f, bakeryId: e.target.value } : f))}
                    required
                  >
                    <option value="">—</option>
                    {bakeries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
