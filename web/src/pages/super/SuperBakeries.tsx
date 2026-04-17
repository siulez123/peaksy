import { useEffect, useState } from 'react';
import { superApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label } from '../../components/ui';

export function SuperBakeries() {
  const { token } = useAuth();
  const [items, setItems] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      active: boolean;
      plan: string;
      _count: { users: number; products: number; orders: number };
    }>
  >([]);
  const [form, setForm] = useState({ name: '', slug: '' });
  const [err, setErr] = useState<string | null>(null);

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

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await superApi.bakeries.create(token, {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      setForm({ name: '', slug: '' });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro');
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
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Padarias</h1>
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
      <Card className="mt-8">
        <h2 className="mb-4 font-semibold text-stone-900">Nova padaria</h2>
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="minha-padaria"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
