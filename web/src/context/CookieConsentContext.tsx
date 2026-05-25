import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentChoice,
} from '../lib/cookieConsent';

type CookieConsentContextValue = {
  consent: CookieConsentChoice | null;
  accept: () => void;
  reject: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentChoice | null>(() => readCookieConsent());

  const accept = useCallback(() => {
    writeCookieConsent('accepted');
    setConsent('accepted');
  }, []);

  const reject = useCallback(() => {
    writeCookieConsent('rejected');
    setConsent('rejected');
  }, []);

  const value = useMemo(() => ({ consent, accept, reject }), [consent, accept, reject]);

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
}
