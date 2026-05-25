import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';
import { useCookieConsent } from '../context/CookieConsentContext';
import { useHostTenantSlug } from '../lib/tenantHost';

/** Regista page views em cada mudança de rota (SPA). */
export function AnalyticsTracker() {
  const { pathname } = useLocation();
  const hostSlug = useHostTenantSlug();
  const { consent } = useCookieConsent();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== 'accepted') {
      lastPath.current = null;
      return;
    }
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname, hostSlug);
  }, [pathname, hostSlug, consent]);

  return null;
}
