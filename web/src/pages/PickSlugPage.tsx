import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label, PageHeader } from '../components/ui';
import { useI18n } from '../i18n/context';

type Mode = 'loja' | 'admin';

export function PickSlugPage({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const [slug, setSlug] = useState('');
  const nav = useNavigate();

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!s) return;
    if (mode === 'loja') nav(`/loja/${encodeURIComponent(s)}`);
    else nav(`/admin/${encodeURIComponent(s)}/entrar`);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader
        title={mode === 'loja' ? t('pickSlug.shopTitle') : t('pickSlug.adminTitle')}
        subtitle={t('pickSlug.subtitle')}
      />
      <Card>
        <form onSubmit={go} className="space-y-4">
          <div>
            <Label>{t('pickSlug.label')}</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t('pickSlug.placeholder')}
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="w-full">
            {t('common.continue')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
