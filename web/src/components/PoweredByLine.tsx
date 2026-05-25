import { SOB_LEGAL_NAME, SOB_WEBSITE_URL } from '../lib/company';

export function PoweredByLine({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs font-medium leading-relaxed text-muted ${className}`.trim()}>
      Powered by{' '}
      <a
        href={SOB_WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold text-ink underline decoration-ink/20 underline-offset-2 transition hover:text-primary"
      >
        {SOB_LEGAL_NAME}
      </a>
    </p>
  );
}
