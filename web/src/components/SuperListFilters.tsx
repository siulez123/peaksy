import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui';
import { useI18n } from '../i18n/context';

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  children?: ReactNode;
  showingLabel?: string;
};

export function SuperListFilters({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  showingLabel,
}: Props) {
  const { t } = useI18n();

  return (
    <CardFilters>
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-label={t('superList.search')}
        />
      </div>
      {children}
      {showingLabel && (
        <p className="w-full text-xs text-muted sm:w-auto sm:shrink-0">{showingLabel}</p>
      )}
    </CardFilters>
  );
}

function CardFilters({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      {children}
    </div>
  );
}

export function SuperFilterSelect({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <select
        className="mt-1 w-full min-w-[8rem] rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SuperListPagination({
  offset,
  limit,
  total,
  onPageChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onPageChange: (nextOffset: number) => void;
}) {
  const { t } = useI18n();
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  if (total <= limit && offset === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted">
        {t('superList.pageOf', {
          page: String(page),
          total: String(totalPages),
        })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors enabled:hover:bg-slate-50 disabled:opacity-40"
        >
          {t('superList.prev')}
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(offset + limit)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink transition-colors enabled:hover:bg-slate-50 disabled:opacity-40"
        >
          {t('superList.next')}
        </button>
      </div>
    </div>
  );
}
