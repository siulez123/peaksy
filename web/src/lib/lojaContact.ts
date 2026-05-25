/** Texto para pesquisa no Google Maps (morada + código postal e localidade). */
export function googleMapsSearchQuery(parts: {
  addressLine: string;
  postalCode: string;
  locality: string;
}): string {
  const line2 = [parts.postalCode, parts.locality].filter((s) => s.trim()).join(' ');
  return [parts.addressLine.trim(), line2].filter(Boolean).join(', ');
}

/** URL de pesquisa no Google Maps, ou null se não houver dados suficientes. */
export function googleMapsSearchUrl(parts: {
  addressLine: string;
  postalCode: string;
  locality: string;
}): string | null {
  const q = googleMapsSearchQuery(parts).trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** `href` para abrir o compositor de chamada no telemóvel. */
export function telHref(phone: string): string {
  const t = phone.trim().replace(/[\s\-().]/g, '');
  if (!t) return '#';
  return `tel:${t}`;
}
