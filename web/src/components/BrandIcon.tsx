import type { LucideIcon } from 'lucide-react';

const sizes = {
  xs: { box: 'h-7 w-7 rounded-lg', icon: 'h-3.5 w-3.5' },
  sm: { box: 'h-10 w-10 rounded-xl', icon: 'h-[1.125rem] w-[1.125rem]' },
  md: { box: 'h-11 w-11 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
} as const;

type Props = {
  icon: LucideIcon;
  size?: keyof typeof sizes;
  className?: string;
  /** Ícone decorativo (escondido de leitores de ecrã). */
  decorative?: boolean;
};

/** Ícone de marca: contorno branco em caixa indigo com borda fina (guia Peaksy). */
export function BrandIcon({ icon: Icon, size = 'md', className = '', decorative = true }: Props) {
  const s = sizes[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-white/25 bg-primary text-white shadow-[var(--shadow-primary)] ${s.box} ${className}`.trim()}
      aria-hidden={decorative ? true : undefined}
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </span>
  );
}
