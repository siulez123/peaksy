import { useEffect, useState } from 'react';
import { superApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../api';
import { Button, Card, Input, Label } from '../../components/ui';

export function SuperUsers() {
  const { token } = useAuth();
  const [items, setItems] = useState<
    Array<{
      id: string;
      email: string;
      role: UserRole;
      bakery: { id: string; name: string; slug: string } | null;
    }>
  >([]);
  const [bakeries, setBakeries] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'BAKERY_ADMIN' as UserRole,
    bakeryId: '',
  });
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      const [users, b] = await Promise.all([superApi.users.list(token), superApi.bakeries.list(token)]);
      setItems(users);
      setBakeries(b.map((x) => ({ id: x.id, name: x.name, slug: x.slug })));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await superApi.users.create(token, {
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        bakeryId: form.role === 'BAKERY_ADMIN' ? form.bakeryId : undefined,
      });
      setForm({ email: '', password: '', role: 'BAKERY_ADMIN', bakeryId: '' });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
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
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Utilizadores</h1>
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
              </div>
              <Button type="button" variant="danger" className="self-start text-sm" onClick={() => void remove(u.id)}>
                Apagar
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="mb-4 font-semibold text-stone-900">Novo utilizador</h2>
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
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
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
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
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
          <div className="sm:col-span-2">
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
