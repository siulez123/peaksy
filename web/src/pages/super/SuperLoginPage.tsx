import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, PageHeader } from '../../components/ui';

export function SuperLoginPage() {
  const { setSession } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const data = await auth.login(email, password);
      if (data.user.role !== 'SUPER_ADMIN') {
        setErr('Apenas super administradores.');
        return;
      }
      setSession(data);
      nav('/super');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha no login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader title="Super admin" subtitle="Acesso à plataforma Comebolos" />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Palavra-passe</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'A entrar…' : 'Entrar'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-stone-500">
        <Link to="/" className="text-orange-600 hover:underline">
          Início
        </Link>
      </p>
    </div>
  );
}
