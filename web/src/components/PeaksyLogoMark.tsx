const LOGO_SRC = '/peaksy-logo.png';

type Props = {
  size?: number;
  className?: string;
};

/** Símbolo Peaksy — P com pico (asset oficial, centrado no contentor). */
export function PeaksyLogoMark({ size = 36, className = '' }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src={LOGO_SRC}
        alt=""
        className="h-full w-full object-contain object-center"
        decoding="async"
        draggable={false}
        aria-hidden
      />
    </span>
  );
}
