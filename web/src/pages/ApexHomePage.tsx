import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Card } from '../components/ui';

/** Página inicial do domínio principal (sem subdomínio de padaria): apenas orientação e super admin. */
export function ApexHomePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-orange-600">Comebolos</p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900 sm:text-4xl">Pré-encomendas de padaria</h1>
        <p className="mt-3 text-stone-600">
          Cada padaria tem o seu próprio endereço na Internet. Acede à tua padaria pelo subdomínio que te foi
          indicado (ex.: <span className="font-mono text-sm text-stone-800">padariademo.comebolos.com</span>).
        </p>
      </div>

      <Card className="border-violet-200 bg-violet-50/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-semibold text-stone-900">Administração da plataforma</h2>
              <p className="mt-1 text-sm text-stone-600">
                Gestão de todas as padarias, utilizadores e métricas globais — acesso reservado a super
                administradores.
              </p>
            </div>
          </div>
          <Link
            to="/super/entrar"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-800"
          >
            Entrar
          </Link>
        </div>
      </Card>

      <p className="text-center text-sm text-stone-500">
        <span className="text-stone-400">Desenvolvimento:</span>{' '}
        <Link to="/loja" className="text-orange-600 hover:underline">
          escolher padaria por slug
        </Link>
      </p>
    </div>
  );
}
