const LOGO_SRC = '/peaksy-mark.png';
/** Proporção do recorte oficial (guia de marca). */
const ASPECT = 148 / 138;

type Props = {
  size?: number;
  className?: string;
};

/** Símbolo Peaksy — P com pico (extraído do guia de marca). */
export function PeaksyLogoMark({ size = 36, className = '' }: Props) {
  const height = Math.round(size * ASPECT);
  return (
    <img
      src={LOGO_SRC}
      alt=""
      width={size}
      height={height}
      className={`block shrink-0 ${className}`.trim()}
      decoding="async"
      draggable={false}
      aria-hidden
    />
  );
}
