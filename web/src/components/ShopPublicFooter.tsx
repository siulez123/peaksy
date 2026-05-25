import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, LayoutDashboard, LogIn, X } from 'lucide-react';
import { auth, type BakeryPublic } from '../api';
import { useAuth } from '../context/AuthContext';
import { googleMapsSearchUrl, telHref } from '../lib/bakeryContact';
import { useAdminPathBase, useResolvedTenantSlug } from '../lib/tenantHost';
import { Button, Input, Label } from './ui';
import { useI18n } from '../i18n/context';

type Props = {
  bakeryName: string;
  subtitle?: string;
  /** Dados públicos da padaria (contacto); null enquanto carrega ou em erro. */
  bakery: BakeryPublic | null;
};

export function ShopPublicFooter({ bakeryName, subtitle, bakery }: Props) {
  const { t } = useI18n();
  const { token, user, bakery: sessionBakery, logout, setSession } = useAuth();
  const slug = useResolvedTenantSlug();
  const adminBase = useAdminPathBase();
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const isBakeryAdminHere =
    token && user?.role === 'BAKERY_ADMIN' && sessionBakery && sessionBakery.slug === slug;

  const mapsUrl = bakery ? googleMapsSearchUrl(bakery) : null;
  const hasContact =
    bakery &&
    (bakery.addressLine.trim() ||
      bakery.postalCode.trim() ||
      bakery.locality.trim() ||
      bakery.phone.trim());

  useEffect(() => {
    if (!loginOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loginOpen]);

  useEffect(() => {
    if (!loginOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loginLoading) setLoginOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loginOpen, loginLoading]);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    if (!slug) {
      setLoginErr(t('footer.noTenant'));
      return;
    }
    setLoginLoading(true);
    try {
      const data = await auth.login(email, password, slug);
      if (data.user.role !== 'BAKERY_ADMIN') {
        setLoginErr(t('footer.bakeryAdminOnly'));
        return;
      }
      setSession(data);
      setEmail('');
      setPassword('');
      setLoginOpen(false);
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : t('common.loginFailed'));
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <>
      <footer className="mt-12 border-t-2 border-ink/10 pt-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{t('footer.bakery')}</h2>
            <p className="mt-2 text-lg font-extrabold text-ink">{bakeryName}</p>

            {hasContact && bakery && (
              <div className="mt-3 border-t border-ink/5 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{t('footer.contact')}</h3>
                <address className="mt-2 space-y-2 not-italic text-sm font-medium leading-relaxed text-ink/80">
                  {(bakery.addressLine.trim() || bakery.postalCode.trim() || bakery.locality.trim()) && (
                    <div>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex max-w-full flex-col gap-0.5 text-accent underline decoration-accent/40 underline-offset-2 transition hover:text-accent-hover hover:decoration-accent"
                        >
                          {bakery.addressLine.trim() ? (
                            <span className="break-words text-ink">{bakery.addressLine}</span>
                          ) : null}
                          {(bakery.postalCode.trim() || bakery.locality.trim()) && (
                            <span className="break-words text-ink">
                              {[bakery.postalCode, bakery.locality].filter((s) => s.trim()).join(' ')}
                            </span>
                          )}
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-accent">
                            {t('footer.maps')}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          </span>
                        </a>
                      ) : (
                        <>
                          {bakery.addressLine.trim() ? (
                            <p className="text-ink">{bakery.addressLine}</p>
                          ) : null}
                          {(bakery.postalCode.trim() || bakery.locality.trim()) && (
                            <p className="text-muted">
                              {[bakery.postalCode, bakery.locality].filter((s) => s.trim()).join(' ')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {bakery.phone.trim() && (
                    <p>
                      <span className="text-muted">{t('footer.phoneLabel')}</span>
                      <a
                        href={telHref(bakery.phone)}
                        className="font-bold text-accent underline decoration-accent/40 underline-offset-2 hover:text-accent-hover"
                      >
                        {bakery.phone}
                      </a>
                    </p>
                  )}
                </address>
              </div>
            )}
          </div>

          <div className="lg:col-span-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">{t('footer.administrators')}</h2>
            <div className="mt-4">
              {isBakeryAdminHere ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={adminBase}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink/10 bg-surface px-4 py-2.5 text-sm font-bold text-ink shadow-sm transition hover:bg-canvas"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    {t('footer.manageShop')}
                  </Link>
                  <button
                    type="button"
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"
                    onClick={() => {
                      logout();
                      window.location.reload();
                    }}
                  >
                    {t('common.logout')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border-2 border-ink/10 bg-surface px-4 py-2.5 text-sm font-bold text-ink shadow-sm transition hover:bg-canvas sm:w-auto"
                  onClick={() => {
                    setLoginOpen(true);
                    setLoginErr(null);
                  }}
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  {t('footer.signInAdmin')}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t-2 border-ink/5 pt-6 sm:col-span-2 sm:border-0 sm:pt-0 lg:col-span-3 lg:border-t-0">
            <p className="text-xs font-medium leading-relaxed text-muted">
              Powered by{' '}
              <a
                href="https://slicesofbravery.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-ink underline decoration-ink/20 underline-offset-2 transition hover:text-accent"
              >
                Slices of Bravery Lda
              </a>
            </p>
            <p className="text-xs font-medium text-zinc-400">{t('footer.rights')}</p>
          </div>
        </div>
      </footer>

      {loginOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-login-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!loginLoading) setLoginOpen(false);
            }}
            aria-label={t('common.close')}
          />
          <div
            className="relative max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-white shadow-2xl sm:rounded-2xl"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-ink/5 bg-white px-4 py-3 sm:px-6">
              <h2 id="admin-login-modal-title" className="text-lg font-semibold text-ink">
                {t('footer.signInTitle')}
              </h2>
              <button
                type="button"
                className="rounded-xl p-2 text-muted hover:bg-canvas"
                onClick={() => !loginLoading && setLoginOpen(false)}
                disabled={loginLoading}
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-6">
              <p className="text-sm text-muted">
                <span className="font-medium text-ink">{bakeryName}</span>
                {subtitle ? (
                  <>
                    {' · '}
                    <span className="text-muted">{subtitle}</span>
                  </>
                ) : null}
              </p>
              <p className="text-xs leading-relaxed text-muted">{t('footer.signInDesc')}</p>

              {loginErr && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {loginErr}
                </p>
              )}

              <form onSubmit={submitLogin} className="space-y-4">
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
                <Button type="submit" className="w-full" disabled={loginLoading} variant="primary">
                  {loginLoading ? t('footer.signingIn') : t('footer.signIn')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
