import { parseError } from './api-error';
import { tokenStorage } from './token-storage';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

type Listener = () => void;
const sessionExpiredListeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired() {
  tokenStorage.clear();
  sessionExpiredListeners.forEach((listener) => listener());
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Impede o retry automatico nas chamadas de login/refresh. */
  skipAuthRetry?: boolean;
}

/**
 * Refresh com single-flight: varias requisicoes que falham ao mesmo tempo
 * compartilham uma unica chamada de renovacao de token.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = tokenStorage.refreshToken;
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
        user: unknown;
        household: unknown;
      };
      tokenStorage.setSession(data);
      return true;
    } catch {
      return false;
    } finally {
      // Libera o single-flight somente apos a conclusao da promessa.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();

  return refreshInFlight;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

async function request<T>(path: string, options: RequestOptions, params?: Record<string, unknown>): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  const token = tokenStorage.accessToken;
  if (token) finalHeaders.set('Authorization', `Bearer ${token}`);

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      ...rest,
      headers: finalHeaders,
      body: payload,
    });
  } catch {
    const error = new Error('Sem conexao com o servidor');
    throw error;
  }

  if (response.status === 401 && !skipAuthRetry) {
    const renewed = await refreshSession();
    if (renewed) {
      return request<T>(path, options, params);
    }
    notifySessionExpired();
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>(path, { method: 'GET' }, params),

  post: <T>(path: string, body?: unknown, params?: Record<string, unknown>) =>
    request<T>(path, { method: 'POST', body }, params),

  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, params?: Record<string, unknown>) =>
    request<T>(path, { method: 'PATCH', body }, params),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Chamadas publicas, sem retry de refresh. */
  public: {
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'POST', body, skipAuthRetry: true }),
  },
};
