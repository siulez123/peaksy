import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Card } from '../components/ui';
import { useHostTenantSlug } from '../lib/tenantHost';

/** Padaria inexistente ou inativa (slug inválido). */
export function BakeryNotFoundPage({ slug }: { slug: string }) {
  const hostSlug = useHostTenantSlug();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <Card className="text-center">
        <Store className="mx-auto h-14 w-14 text-amber-500/90" strokeWidth={1.25} />
        <h1 className="mt-5 text-xl font-semibold text-stone-900">Padaria não encontrada</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          Não há uma padaria registada com o identificador{' '}
          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-stone-800">{slug}</span>.
          Verifica o endereço ou o link que recebeste.
        </p>
        {hostSlug ? (
          <p className="mt-4 text-xs text-stone-500">
            Se o endereço estiver correto, a padaria pode ter sido desativada. Contacta quem te enviou o link.
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
          >
            Página inicial Comebolos
          </Link>
          {!hostSlug && (
            <Link
              to="/loja"
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Escolher padaria
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
