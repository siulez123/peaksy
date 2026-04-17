import { Link } from 'react-router-dom';
import { Store, Shield, Crown, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui';

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-orange-600">Comebolos</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900 sm:text-4xl">Pré-encomendas de padaria</h1>
        <p className="mt-3 text-stone-600">
          Escolhe o teu percurso: encomendar como cliente, gerir a tua padaria ou administrar a plataforma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1">
        <Link to="/loja">
          <Card className="group flex items-start gap-4 transition hover:border-orange-200 hover:shadow-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <Store className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h2 className="font-semibold text-stone-900">Loja (cliente)</h2>
              <p className="mt-1 text-sm text-stone-600">
                Vê produtos, escolhe dia de levantamento e paga com Stripe.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                Continuar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Card>
        </Link>

        <Link to="/admin">
          <Card className="group flex items-start gap-4 transition hover:border-orange-200 hover:shadow-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Shield className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h2 className="font-semibold text-stone-900">Área da padaria</h2>
              <p className="mt-1 text-sm text-stone-600">Produtos, dias de levantamento, pedidos e produção.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                Continuar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Card>
        </Link>

        <Link to="/super">
          <Card className="group flex items-start gap-4 transition hover:border-orange-200 hover:shadow-md">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
              <Crown className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h2 className="font-semibold text-stone-900">Super admin</h2>
              <p className="mt-1 text-sm text-stone-600">Padarias, utilizadores e métricas globais.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                Continuar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
