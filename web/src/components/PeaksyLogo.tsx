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
      className={`flex items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`.trim()}
    >
      <PeaksyLogoMark size={36} />
      <span className={`text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Peaksy
      </span>
    </Link>
  );
}
