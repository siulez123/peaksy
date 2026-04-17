import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label, PageHeader } from '../components/ui';

type Mode = 'loja' | 'admin';

export function PickSlugPage({ mode }: { mode: Mode }) {
  const [slug, setSlug] = useState('');
  const nav = useNavigate();

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!s) return;
    if (mode === 'loja') nav(`/loja/${encodeURIComponent(s)}`);
    else nav(`/admin/${encodeURIComponent(s)}/entrar`);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader
        title={mode === 'loja' ? 'Qual padaria?' : 'Área da padaria'}
        subtitle="Introduz o identificador (slug) da padaria, ex.: padariademo"
      />
      <Card>
        <form onSubmit={go} className="space-y-4">
          <div>
            <Label>Slug da padaria</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="padariademo"
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="w-full">
            Continuar
          </Button>
        </form>
      </Card>
    </div>
  );
}
