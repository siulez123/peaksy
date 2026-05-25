import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, PageHeader } from '../../components/ui';
import { useI18n } from '../../i18n/context';
import { loginErrorMessage } from '../../lib/loginErrorMessage';

export function SuperLoginPage() {
  const { t } = useI18n();
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
        setErr(t('superLogin.superAdminOnly'));
        return;
      }
      setSession(data);
      nav('/super');
    } catch (e) {
      setErr(loginErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader title={t('superLogin.title')} subtitle={t('superLogin.subtitle')} />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>{t('common.email')}</Label>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>{t('common.password')}</Label>
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
            {loading ? t('superLogin.signingIn') : t('superLogin.signIn')}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/" className="font-bold text-primary hover:text-primary-hover hover:underline">
          {t('superLogin.home')}
        </Link>
      </p>
    </div>
  );
}
