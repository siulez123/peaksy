import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, BakeryRef, LoginResponse } from '../api';

const TOKEN_KEY = 'comebolos_token';
const USER_KEY = 'comebolos_user';
const BAKERY_KEY = 'comebolos_bakery';

function loadStored(): { token: string | null; user: AuthUser | null; bakery: BakeryRef | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const bakeryRaw = localStorage.getItem(BAKERY_KEY);
    if (!token || !userRaw) return { token: null, user: null, bakery: null };
    return {
      token,
      user: JSON.parse(userRaw) as AuthUser,
      bakery: bakeryRaw ? (JSON.parse(bakeryRaw) as BakeryRef) : null,
    };
  } catch {
    return { token: null, user: null, bakery: null };
  }
}

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  bakery: BakeryRef | null;
  setSession: (data: LoginResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadStored);

  const setSession = useCallback((data: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.bakery) localStorage.setItem(BAKERY_KEY, JSON.stringify(data.bakery));
    else localStorage.removeItem(BAKERY_KEY);
    setState({
      token: data.token,
      user: data.user,
      bakery: data.bakery,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(BAKERY_KEY);
    setState({ token: null, user: null, bakery: null });
  }, []);

  const value = useMemo(
    () => ({
      token: state.token,
      user: state.user,
      bakery: state.bakery,
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
