import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, onSessionExpired } from '@/lib/api';
import { tokenStorage } from '@/lib/token-storage';
import type { Household, TokenResponse, User } from '@/types';

interface SessionState {
  user: User | null;
  household: Household | null;
  initializing: boolean;
}

interface AuthContextValue extends SessionState {
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    householdName?: string;
    inviteCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshHousehold: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    user: tokenStorage.getUser<User>(),
    household: tokenStorage.getHousehold<Household>(),
    initializing: true,
  });

  const applySession = useCallback((data: TokenResponse) => {
    tokenStorage.setSession(data);
    setState({ user: data.user, household: data.household, initializing: false });
  }, []);

  useEffect(() => {
    // Sessao existente: confirma com o backend para pegar dados atualizados.
    if (!tokenStorage.accessToken) {
      setState((prev) => ({ ...prev, initializing: false }));
      return;
    }

    let cancelled = false;
    api
      .get<User>('/auth/me')
      .then((user) => {
        if (cancelled) return;
        setState((prev) => ({ ...prev, user, initializing: false }));
      })
      .catch(() => {
        if (cancelled) return;
        tokenStorage.clear();
        setState({ user: null, household: null, initializing: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setState({ user: null, household: null, initializing: false });
      }),
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.public.post<TokenResponse>('/auth/login', { email, password });
      applySession(data);
    },
    [applySession],
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      householdName?: string;
      inviteCode?: string;
    }) => {
      const data = await api.public.post<TokenResponse>('/auth/register', input);
      applySession(data);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.refreshToken;
    // Revoga o refresh token no backend antes de limpar a sessao local,
    // senao a chamada sai sem Authorization e o token continua valido.
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Sem rede ou token ja expirado: a limpeza local vale.
    }
    tokenStorage.clear();
    setState({ user: null, household: null, initializing: false });
  }, []);

  const refreshProfile = useCallback(async () => {
    const user = await api.get<User>('/auth/me');
    tokenStorage.setUser(user);
    setState((prev) => ({ ...prev, user }));
  }, []);

  const refreshHousehold = useCallback(async () => {
    const data = await api.get<Household>('/household');
    tokenStorage.setHousehold(data);
    setState((prev) => ({ ...prev, household: data }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, refreshProfile, refreshHousehold }),
    [state, login, register, logout, refreshProfile, refreshHousehold],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  }
  return context;
}
