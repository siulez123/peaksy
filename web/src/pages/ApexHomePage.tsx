import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Package,
  Play,
  ShoppingBag,
  Sparkles,
  Store,
  Zap,
} from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { PoweredByLine } from '../components/PoweredByLine';
import { useI18n } from '../i18n/context';
import { CONTACT_EMAIL } from '../lib/company';

const DEMO_EXAMPLE = 'lojademo.peaksy.com';

function PeaksyLogo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white shadow-[var(--shadow-primary)]">
        P
      </div>
      <span className={`text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Peaksy
      </span>
    </Link>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
    >
      {children}
    </a>
  );
}

function HeroPreview() {
  const { t } = useI18n();
  const rows = [
    { id: '#1042', name: 'Maria S.', time: '09:12', items: 3, status: 'new' as const, total: '€24.50' },
    { id: '#1041', name: 'João P.', time: '09:08', items: 5, status: 'prep' as const, total: '€41.00' },
    { id: '#1040', name: 'Ana R.', time: '08:55', items: 2, status: 'ready' as const, total: '€16.00' },
    { id: '#1039', name: 'Carlos M.', time: '08:41', items: 4, status: 'prep' as const, total: '€32.50' },
  ];
  const statusLabel = {
    new: t('apex.previewNew'),
    prep: t('apex.previewPrep'),
    ready: t('apex.previewReady'),
  };
  const statusClass = {
    new: 'bg-indigo-500/15 text-indigo-300',
    prep: 'bg-violet-500/15 text-violet-300',
    ready: 'bg-emerald-500/15 text-emerald-300',
  };

  return (
    <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
      <div className="absolute -inset-4 rounded-3xl bg-indigo-500/20 blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-sm font-semibold text-white">{t('apex.previewTitle')}</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
            {t('apex.previewLive')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="px-4 py-2 font-medium">{t('apex.previewColId')}</th>
                <th className="px-2 py-2 font-medium">{t('apex.previewColCustomer')}</th>
                <th className="px-2 py-2 font-medium">{t('apex.previewColTime')}</th>
                <th className="px-2 py-2 font-medium">{t('apex.previewColStatus')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('apex.previewColTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-slate-400">{r.id}</td>
                  <td className="px-2 py-2.5 text-white">{r.name}</td>
                  <td className="px-2 py-2.5 text-slate-400">{r.time}</td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass[r.status]}`}
                    >
                      {statusLabel[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-white">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ApexHomePage() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const highlights = [
    { icon: Zap, title: t('apex.highlight1Title'), desc: t('apex.highlight1Desc') },
    { icon: Sparkles, title: t('apex.highlight2Title'), desc: t('apex.highlight2Desc') },
    { icon: BarChart3, title: t('apex.highlight3Title'), desc: t('apex.highlight3Desc') },
  ];

  const features = [
    { icon: Calendar, title: t('apex.feature1Title'), desc: t('apex.feature1Desc') },
    { icon: ShoppingBag, title: t('apex.feature2Title'), desc: t('apex.feature2Desc') },
    { icon: LayoutGrid, title: t('apex.feature3Title'), desc: t('apex.feature3Desc') },
    { icon: Package, title: t('apex.feature4Title'), desc: t('apex.feature4Desc') },
    { icon: Store, title: t('apex.feature5Title'), desc: t('apex.feature5Desc') },
    { icon: BarChart3, title: t('apex.feature6Title'), desc: t('apex.feature6Desc') },
  ];

  const steps = [
    { n: '1', title: t('apex.howStep1Title'), desc: t('apex.howStep1Desc') },
    { n: '2', title: t('apex.howStep2Title'), desc: t('apex.howStep2Desc', { example: DEMO_EXAMPLE }) },
    { n: '3', title: t('apex.howStep3Title'), desc: t('apex.howStep3Desc') },
  ];

  const strip = [
    { icon: Zap, title: t('apex.strip1Title'), desc: t('apex.strip1Desc') },
    { icon: Clock, title: t('apex.strip2Title'), desc: t('apex.strip2Desc') },
    { icon: CheckCircle2, title: t('apex.strip3Title'), desc: t('apex.strip3Desc') },
    { icon: Sparkles, title: t('apex.strip4Title'), desc: t('apex.strip4Desc') },
  ];

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Hero + nav */}
      <header className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(79,70,229,0.35),transparent)]"
          aria-hidden
        />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <PeaksyLogo light />
          <div className="hidden items-center gap-8 md:flex">
            <NavLink href="#features">{t('apex.navFeatures')}</NavLink>
            <NavLink href="#how-it-works">{t('apex.navHowItWorks')}</NavLink>
            <NavLink href="#pricing">{t('apex.navPricing')}</NavLink>
            <NavLink href="#about">{t('apex.navAbout')}</NavLink>
          </div>
          <LanguageSwitcher variant="dark" />
        </nav>

        <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-28 lg:pt-10">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-200">
              <Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden />
              {t('apex.heroBadge')}
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]">
              {t('apex.heroTitle')}{' '}
              <span className="text-indigo-400">{t('apex.heroTitleHighlight')}</span>{' '}
              <span className="text-indigo-300">{t('apex.heroTitleEnd')}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              {t('apex.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#pricing"
                className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover hover:shadow-[0_6px_20px_rgb(79_70_229/0.35)]"
              >
                {t('apex.heroCtaPrimary')}
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-medium text-slate-200 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-white"
              >
                <Play className="h-4 w-4 text-indigo-400" />
                {t('apex.heroCtaSecondary')}
              </a>
            </div>
          </div>
          <HeroPreview />
        </div>

        <div className="relative z-10 border-t border-white/5 bg-slate-950/50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 sm:py-14">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center sm:text-left">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 sm:mx-0">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-b border-border bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {t('apex.featuresTitle')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">{t('apex.featuresSubtitle')}</p>
          </div>
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <li
                key={title}
                className="rounded-2xl border border-border bg-canvas p-6 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {t('apex.howTitle')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">{t('apex.howSubtitle')}</p>
          </div>
          <ol className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="relative rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow-card)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white shadow-[var(--shadow-primary)]">
                  {step.n}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Strip */}
      <section className="border-y border-border bg-slate-50 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {strip.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {t('apex.pricingTitle')}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">{t('apex.pricingSubtitle')}</p>
          <p className="mt-6 inline-flex rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-soft-text">
            {t('apex.pricingBadge')}
          </p>
          <p className="mt-4 text-sm text-muted">{t('apex.pricingNote')}</p>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20 border-t border-border bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {t('apex.aboutTitle')}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted">{t('apex.aboutDesc')}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-primary-soft/80 via-canvas to-canvas py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {t('apex.ctaTitle')}
          </h2>
          <p className="mt-4 text-muted">{t('apex.ctaSubtitle')}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-8 inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-medium text-white shadow-[var(--shadow-primary)] transition-all hover:bg-primary-hover"
          >
            {t('apex.ctaButton')}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <PeaksyLogo />
          <Link
            to="/super/entrar"
            className="text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            {t('apex.footerPlatform')}
          </Link>
        </div>
        <div className="mx-auto mt-6 flex max-w-6xl flex-col gap-3 px-4 sm:px-6">
          <PoweredByLine />
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-xs font-medium text-muted transition-colors hover:text-primary"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="text-xs text-muted">{t('apex.footerRights', { year })}</p>
        </div>
      </footer>
    </div>
  );
}
