import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Card, PageFooter } from '../components/ui';
import { useI18n } from '../i18n/context';

export function NotFoundPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <Card className="text-center">
        <FileQuestion className="mx-auto h-14 w-14 text-slate-300" strokeWidth={1.25} />
        <p className="mt-3 text-sm font-medium uppercase tracking-wide text-muted">404</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">{t('notFound.title')}</h1>
        <p className="mt-3 text-sm text-muted">{t('notFound.desc')}</p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-[2.75rem] items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover"
        >
          {t('notFound.back')}
        </Link>
      </Card>
      <PageFooter />
    </div>
  );
}
