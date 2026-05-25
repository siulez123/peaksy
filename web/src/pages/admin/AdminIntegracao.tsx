import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { buildEmbedCodes, embedVariantLabel, type EmbedVariant } from '../../lib/embedCodes';
import { useResolvedTenantSlug } from '../../lib/tenantHost';
import { useAuth } from '../../context/AuthContext';
import { Card, SectionTitle } from '../../components/ui';
import { useI18n } from '../../i18n/context';

const VARIANTS: EmbedVariant[] = ['link', 'button', 'iframe'];

export function AdminIntegracao() {
  const { t } = useI18n();
  const slug = useResolvedTenantSlug();
  const { loja } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const codes = useMemo(
    () => buildEmbedCodes(slug, loja?.name ?? slug),
    [slug, loja?.name]
  );

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <SectionTitle
        title={t('adminIntegracao.title')}
        description={t('adminIntegracao.subtitle')}
      />

      <p className="mb-6 text-sm text-muted">{t('adminIntegracao.trackingNote')}</p>

      <div className="space-y-4">
        {VARIANTS.map((variant) => (
          <Card key={variant}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  {t(`adminIntegracao.variant.${variant}`)}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {t('adminIntegracao.variantDesc', { type: embedVariantLabel(variant) })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copy(variant, codes[variant])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-slate-50"
              >
                {copied === variant ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {t('adminIntegracao.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    {t('adminIntegracao.copy')}
                  </>
                )}
              </button>
            </div>
            <pre className="mt-4 max-h-40 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
              <code>{codes[variant]}</code>
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
