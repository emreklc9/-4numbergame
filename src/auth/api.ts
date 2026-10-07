import { API_URL } from '../config';

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string;
  avatarId: string;
  isGuest: boolean;
};

export type Session = { accessToken: string; refreshToken: string; user: AuthUser };
export type AccessSession = { accessToken: string; user: AuthUser };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 10_000;

// Erişim belirteci süresi dolunca (401) AuthProvider yeni belirteç üretir; istek bir kez tekrarlanır.
type RefreshHandler = (staleToken: string) => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;
export const setRefreshHandler = (handler: RefreshHandler | null) => {
  refreshHandler = handler;
};

export async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string; timeoutMs?: number },
): Promise<T> {
  try {
    return await send<T>(path, init);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401 && init.token && refreshHandler)) {
      throw error;
    }
    const fresh = await refreshHandler(init.token);
    if (!fresh) throw error;
    return send<T>(path, { ...init, token: fresh });
  }
}

async function send<T>(
  path: string,
  init: { method?: string; body?: unknown; token?: string; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
      throw new ApiError(message ?? 'İşlem tamamlanamadı', response.status);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Ağ hatası ve zaman aşımı status 0 ile ayırt edilir.
    throw new ApiError('Sunucuya ulaşılamadı. Bağlantını kontrol et.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const authApi = {
  guest: () => request<Session>('/auth/guest', { method: 'POST', body: {} }),
  register: (email: string, password: string) =>
    request<Session>('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: { email, password } }),
  google: (idToken: string, token?: string) =>
    request<Session>(token ? '/auth/google/link' : '/auth/google', {
      method: 'POST',
      body: { idToken },
      token,
    }),
  upgrade: (token: string, email: string, password: string) =>
    request<Session>('/auth/upgrade', { method: 'POST', body: { email, password }, token }),
  refresh: (refreshToken: string) =>
    request<AccessSession>('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken: string) =>
    request<unknown>('/auth/logout', { method: 'POST', body: { refreshToken }, timeoutMs: 4_000 }),
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<Session>('/auth/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
      token,
    }),
  me: (token: string) => request<AuthUser>('/auth/me', { token }),
  updateProfile: (token: string, body: { displayName?: string; avatarId?: string }) =>
    request<AuthUser>('/auth/me', { method: 'PATCH', body, token }),
};
