import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Card } from '../components/ui';
import { useI18n } from '../i18n/context';

/** Página não encontrada (404). */
export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <Card className="text-center">
        <FileQuestion className="mx-auto h-14 w-14 text-stone-400" strokeWidth={1.25} />
        <p className="mt-3 text-sm font-medium uppercase tracking-wide text-stone-500">404</p>
        <h1 className="mt-2 text-xl font-semibold text-stone-900">{t('notFound.title')}</h1>
        <p className="mt-3 text-sm text-stone-600">{t('notFound.desc')}</p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-orange-600"
        >
          {t('notFound.back')}
        </Link>
      </Card>
    </div>
  );
}
