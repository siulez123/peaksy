import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui';

export function ShopSuccessPage() {
  const { slug = '' } = useParams();
  const [sp] = useSearchParams();
  const session = sp.get('session_id');
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Card>
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="mt-4 text-xl font-semibold text-stone-900">Pagamento recebido</h1>
        <p className="mt-2 text-stone-600">
          O teu pedido foi registado. Enviámos uma mensagem SMS com o resumo; se indicaste email, também recebes a
          confirmação no correio.
        </p>
        {session && (
          <p className="mt-2 break-all font-mono text-xs text-stone-400">Sessão: {session}</p>
        )}
        <Link
          to={`/loja/${slug}`}
          className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          Voltar à loja
        </Link>
      </Card>
    </div>
  );
}

export function ShopCancelPage() {
  const { slug = '' } = useParams();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Card>
        <XCircle className="mx-auto h-14 w-14 text-amber-600" />
        <h1 className="mt-4 text-xl font-semibold text-stone-900">Pagamento cancelado</h1>
        <p className="mt-2 text-stone-600">Podes voltar a tentar quando quiseres.</p>
        <Link
          to={`/loja/${slug}`}
          className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          Voltar à loja
        </Link>
      </Card>
    </div>
  );
}
