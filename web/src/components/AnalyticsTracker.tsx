import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';
import { useHostTenantSlug } from '../lib/tenantHost';

/** Regista page views em cada mudança de rota (SPA). */
export function AnalyticsTracker() {
  const { pathname } = useLocation();
  const hostSlug = useHostTenantSlug();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname, hostSlug);
  }, [pathname, hostSlug]);

  return null;
}
