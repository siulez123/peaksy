import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { auth, publicApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input, Label, PageHeader } from '../../components/ui';
import { useAdminPathBase, useResolvedTenantSlug } from '../../lib/tenantHost';
import { useI18n } from '../../i18n/context';

export function AdminLoginPage() {
  const { t } = useI18n();
  const { slug: pathSlug } = useParams<{ slug?: string }>();
  const slug = useResolvedTenantSlug();
  const adminBase = useAdminPathBase();
  const shopHomeHref = pathSlug ? `/loja/${encodeURIComponent(pathSlug)}` : '/';
  const { setSession } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  type HeadState = { status: 'loading' } | { status: 'ok'; name: string } | { status: 'err' };
  const [head, setHead] = useState<HeadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setHead({ status: 'err' });
      return;
    }
    setHead({ status: 'loading' });
    void publicApi
      .bakery(slug)
      .then((b) => {
        if (!cancelled) setHead({ status: 'ok', name: b.name });
      })
      .catch(() => {
        if (!cancelled) setHead({ status: 'err' });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const pageTitle =
    head.status === 'loading'
      ? t('adminLogin.loading')
      : head.status === 'err'
        ? t('adminLogin.notFound')
        : head.name;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const data = await auth.login(email, password, slug);
      if (data.user.role !== 'BAKERY_ADMIN') {
        setErr(t('adminLogin.bakeryAdminOnly'));
        return;
      }
      setSession(data);
      nav(adminBase);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('common.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader title={pageTitle} subtitle={t('adminLogin.subtitle')} />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>{t('common.email')}</Label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
            {loading ? t('adminLogin.signingIn') : t('adminLogin.signIn')}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-stone-500">
        <Link to={shopHomeHref} className="font-bold text-accent hover:underline">
          {t('adminLogin.home')}
        </Link>
      </p>
    </div>
  );
}
