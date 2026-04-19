import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, LayoutDashboard, LogIn, X } from 'lucide-react';
import { auth, type BakeryPublic } from '../api';
import { useAuth } from '../context/AuthContext';
import { googleMapsSearchUrl, telHref } from '../lib/bakeryContact';
import { useAdminPathBase, useResolvedTenantSlug } from '../lib/tenantHost';
import { Button, Input, Label } from './ui';

type Props = {
  bakeryName: string;
  subtitle?: string;
  /** Dados públicos da padaria (contacto); null enquanto carrega ou em erro. */
  bakery: BakeryPublic | null;
};

export function ShopPublicFooter({ bakeryName, subtitle, bakery }: Props) {
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
      setLoginErr('Não foi possível identificar a padaria.');
      return;
    }
    setLoginLoading(true);
    try {
      const data = await auth.login(email, password, slug);
      if (data.user.role !== 'BAKERY_ADMIN') {
        setLoginErr('Esta área é só para administradores de padaria.');
        return;
      }
      setSession(data);
      setEmail('');
      setPassword('');
      setLoginOpen(false);
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <>
      <footer className="mt-12 border-t border-stone-200/90 pt-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Padaria</h2>
            <p className="mt-2 text-lg font-semibold text-stone-900">{bakeryName}</p>
            {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
            {slug && (
              <p className="mt-3 font-mono text-xs text-stone-400">
                <span className="text-stone-500">Loja ·</span> {slug}
              </p>
            )}

            {hasContact && bakery && (
              <div className="mt-3 border-t border-stone-100 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Contacto</h3>
                <address className="mt-2 space-y-2 not-italic text-sm leading-relaxed text-stone-600">
                  {(bakery.addressLine.trim() || bakery.postalCode.trim() || bakery.locality.trim()) && (
                    <div>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex max-w-full flex-col gap-0.5 text-orange-700 underline decoration-orange-300 underline-offset-2 transition hover:text-orange-800 hover:decoration-orange-500"
                        >
                          {bakery.addressLine.trim() ? (
                            <span className="break-words text-stone-800">{bakery.addressLine}</span>
                          ) : null}
                          {(bakery.postalCode.trim() || bakery.locality.trim()) && (
                            <span className="break-words text-stone-700">
                              {[bakery.postalCode, bakery.locality].filter((s) => s.trim()).join(' ')}
                            </span>
                          )}
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-orange-600">
                            Ver no Google Maps
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          </span>
                        </a>
                      ) : (
                        <>
                          {bakery.addressLine.trim() ? (
                            <p className="text-stone-700">{bakery.addressLine}</p>
                          ) : null}
                          {(bakery.postalCode.trim() || bakery.locality.trim()) && (
                            <p className="text-stone-600">
                              {[bakery.postalCode, bakery.locality].filter((s) => s.trim()).join(' ')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {bakery.phone.trim() && (
                    <p>
                      <span className="text-stone-500">Telefone · </span>
                      <a
                        href={telHref(bakery.phone)}
                        className="font-medium text-orange-700 underline decoration-orange-300 underline-offset-2 hover:text-orange-800"
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
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Administradores</h2>
            <p className="mt-2 text-sm text-stone-600">
              Acesso reservado aos administradores desta padaria (produtos, dias e encomendas).
            </p>
            <div className="mt-4">
              {isBakeryAdminHere ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={adminBase}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Gerir padaria
                  </Link>
                  <button
                    type="button"
                    className="rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-stone-100"
                    onClick={() => {
                      logout();
                      window.location.reload();
                    }}
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 sm:w-auto"
                  onClick={() => {
                    setLoginOpen(true);
                    setLoginErr(null);
                  }}
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  Login de administrador
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-stone-100 pt-6 sm:col-span-2 sm:border-0 sm:pt-0 lg:col-span-3 lg:border-t-0">
            <p className="text-xs leading-relaxed text-stone-500">
              Powered by{' '}
              <a
                href="https://slicesofbravery.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-2 transition hover:text-orange-700 hover:decoration-orange-400"
              >
                Slices of Bravery Lda
              </a>
            </p>
            <p className="mt-2 text-xs text-stone-400">© 2026 · Todos os direitos reservados.</p>
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
            aria-label="Fechar"
          />
          <div
            className="relative max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-200 bg-white shadow-2xl sm:rounded-2xl"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3 sm:px-6">
              <h2 id="admin-login-modal-title" className="text-lg font-semibold text-stone-900">
                Iniciar sessão
              </h2>
              <button
                type="button"
                className="rounded-xl p-2 text-stone-500 hover:bg-stone-100"
                onClick={() => !loginLoading && setLoginOpen(false)}
                disabled={loginLoading}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4 sm:px-6">
              <p className="text-sm text-stone-600">
                <span className="font-medium text-stone-800">{bakeryName}</span>
                {subtitle ? (
                  <>
                    {' · '}
                    <span className="text-stone-600">{subtitle}</span>
                  </>
                ) : null}
              </p>
              <p className="text-xs leading-relaxed text-stone-500">
                Introduz as credenciais de administrador desta padaria. A sessão mantém-se neste dispositivo.
              </p>

              {loginErr && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {loginErr}
                </p>
              )}

              <form onSubmit={submitLogin} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
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
                <Button type="submit" className="w-full" disabled={loginLoading} variant="primary">
                  {loginLoading ? 'A entrar…' : 'Entrar'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
