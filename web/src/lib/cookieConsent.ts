const STORAGE_KEY = 'peaksy_cookie_consent';

export type CookieConsentChoice = 'accepted' | 'rejected';

export function readCookieConsent(): CookieConsentChoice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCookieConsent(choice: CookieConsentChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent() === 'accepted';
}
