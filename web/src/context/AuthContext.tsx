import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LojaRef, LoginResponse } from '../api';

const TOKEN_KEY = 'peaksy_token';
const USER_KEY = 'peaksy_user';
const LOJA_KEY = 'peaksy_loja';

function loadStored(): { token: string | null; user: AuthUser | null; loja: LojaRef | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const lojaRaw = localStorage.getItem(LOJA_KEY);
    if (!token || !userRaw) return { token: null, user: null, loja: null };
    return {
      token,
      user: JSON.parse(userRaw) as AuthUser,
      loja: lojaRaw ? (JSON.parse(lojaRaw) as LojaRef) : null,
    };
  } catch {
    return { token: null, user: null, loja: null };
  }
}

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loja: LojaRef | null;
  setSession: (data: LoginResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadStored);

  const setSession = useCallback((data: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.loja) localStorage.setItem(LOJA_KEY, JSON.stringify(data.loja));
    else localStorage.removeItem(LOJA_KEY);
    setState({
      token: data.token,
      user: data.user,
      loja: data.loja,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LOJA_KEY);
    setState({ token: null, user: null, loja: null });
  }, []);

  const value = useMemo(
    () => ({
      token: state.token,
      user: state.user,
      loja: state.loja,
      setSession,
      logout,
    }),
    [state, setSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
