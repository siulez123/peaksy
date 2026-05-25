import { Link } from 'react-router-dom';
import { PeaksyLogoMark } from './PeaksyLogoMark';

type Props = {
  light?: boolean;
  className?: string;
};

export function PeaksyLogo({ light = false, className = '' }: Props) {
  return (
    <Link
      to="/"
      className={`flex min-w-0 max-w-full items-center gap-2 transition-opacity hover:opacity-90 sm:gap-2.5 ${className}`.trim()}
    >
      <PeaksyLogoMark size={36} className="shrink-0" />
      <span
        className={`truncate text-base font-semibold tracking-tight sm:text-lg ${light ? 'text-white' : 'text-ink'}`}
      >
        Peaksy
      </span>
    </Link>
  );
}
