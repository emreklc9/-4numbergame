import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiError, authApi, type AuthUser, type Session } from './api';
import { flushOutbox } from '../game/outbox';

const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  signInAsGuest: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const persist = useCallback(async (session: Session) => {
    await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
    setToken(session.accessToken);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    (async () => {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!storedToken) return setStatus('signedOut');

      try {
        const fresh = await authApi.me(storedToken);
        await persist({ accessToken: storedToken, user: fresh });
      } catch (error) {
        // Oturum geçersizse çıkış yapılır; ağ hatasında önbellekteki kullanıcıyla devam edilir.
        if (error instanceof ApiError && error.status === 401) return clear();
        const cached = await SecureStore.getItemAsync(USER_KEY);
        if (!cached) return clear();
        setToken(storedToken);
        setUser(JSON.parse(cached) as AuthUser);
        setStatus('signedIn');
      }
    })();
  }, [persist, clear]);

  // Çevrimdışı biriken rekorlar oturum açıldığında sunucuya gönderilir.
  useEffect(() => {
    if (token) flushOutbox(token);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      signInAsGuest: async () => persist(await authApi.guest()),
      signInWithEmail: async (email, password) => persist(await authApi.login(email, password)),
      registerWithEmail: async (email, password) =>
        // Misafir oturumu varsa hesap dönüştürülür; rekorlar kaybolmaz.
        persist(
          token && user?.isGuest
            ? await authApi.upgrade(token, email, password)
            : await authApi.register(email, password),
        ),
      signInWithGoogle: async (idToken) =>
        persist(await authApi.google(idToken, user?.isGuest ? (token ?? undefined) : undefined)),
      signOut: clear,
    }),
    [status, user, token, persist, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider uygulama kökünde kullanılmalı');
  return context;
}
