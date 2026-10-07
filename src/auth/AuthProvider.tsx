import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ApiError, authApi, setRefreshHandler, type AuthUser, type Session } from './api';

const TOKEN_KEY = 'auth.token';
const REFRESH_KEY = 'auth.refreshToken';
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
  updateProfile: (changes: { displayName?: string; avatarId?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Belirteçler istek sırasında da güncel okunabilsin diye ref'te de tutulur.
  const tokenRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const renewing = useRef<Promise<string | null> | null>(null);

  const persist = useCallback(async (session: Session) => {
    await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
    tokenRef.current = session.accessToken;
    refreshRef.current = session.refreshToken;
    setToken(session.accessToken);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const clear = useCallback(async () => {
    tokenRef.current = null;
    refreshRef.current = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Erişim belirteci süresi dolunca yenileme anahtarıyla sessizce yenilenir. Aynı anda gelen
  // istekler tek yenilemeyi paylaşır. Anahtar reddedilirse (iptal/süre) oturum kapatılır; ağ
  // hatasında oturum korunur.
  const renew = useCallback(
    (staleToken: string): Promise<string | null> => {
      if (tokenRef.current && tokenRef.current !== staleToken) return Promise.resolve(tokenRef.current);
      const refreshToken = refreshRef.current;
      if (!refreshToken) return Promise.resolve(null);
      renewing.current ??= (async () => {
        try {
          const fresh = await authApi.refresh(refreshToken);
          await SecureStore.setItemAsync(TOKEN_KEY, fresh.accessToken);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh.user));
          tokenRef.current = fresh.accessToken;
          setToken(fresh.accessToken);
          setUser(fresh.user);
          return fresh.accessToken;
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) await clear();
          return null;
        } finally {
          renewing.current = null;
        }
      })();
      return renewing.current;
    },
    [clear],
  );

  useEffect(() => {
    setRefreshHandler(renew);
    return () => setRefreshHandler(null);
  }, [renew]);

  useEffect(() => {
    (async () => {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!storedToken) return setStatus('signedOut');
      tokenRef.current = storedToken;
      refreshRef.current = await SecureStore.getItemAsync(REFRESH_KEY);

      try {
        // Süresi dolmuşsa istek katmanı belirteci kendisi yeniler.
        const fresh = await authApi.me(storedToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
        setToken(tokenRef.current ?? storedToken);
        setUser(fresh);
        setStatus('signedIn');
      } catch (error) {
        // Oturum geçersizse çıkış yapılır; ağ hatasında önbellekteki kullanıcıyla devam edilir.
        if (error instanceof ApiError && error.status === 401) return clear();
        const cached = await SecureStore.getItemAsync(USER_KEY);
        if (!cached) return clear();
        setToken(tokenRef.current ?? storedToken);
        setUser(JSON.parse(cached) as AuthUser);
        setStatus('signedIn');
      }
    })();
  }, [clear]);

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
      updateProfile: async (changes) => {
        if (!token) throw new Error('Önce giriş yapmalısın');
        const updated = await authApi.updateProfile(token, changes);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
        setUser(updated);
      },
      signOut: async () => {
        // Yenileme anahtarı sunucuda iptal edilir; sunucuya ulaşılamasa da yerel çıkış yapılır.
        const refreshToken = refreshRef.current;
        if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
        await clear();
      },
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
