import { API_URL } from '../config';

export type AuthUser = {
  id: string;
  email: string | null;
  displayName: string;
  isGuest: boolean;
};

export type Session = { accessToken: string; user: AuthUser };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 10_000;

export async function request<T>(
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
  me: (token: string) => request<AuthUser>('/auth/me', { token }),
};
