import axios, { AxiosHeaders } from 'axios';

/** Бэкенд Gin монтирует маршруты на `/api/v1` (см. main.go). */
function resolveApiBaseURL(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  const root = (raw || 'http://127.0.0.1:8080').replace(/\/+$/, '');
  return root.endsWith('/api/v1') ? root : `${root}/api/v1`;
}

export const api = axios.create({
  baseURL: resolveApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export function getApiBaseURL(): string {
  return resolveApiBaseURL();
}

/** Иначе axios оставляет `Content-Type: application/json` и Gin не видит multipart. */
api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers;
    if (h instanceof AxiosHeaders) {
      h.delete('Content-Type');
    } else if (h && typeof h === 'object') {
      delete (h as Record<string, unknown>)['Content-Type'];
      delete (h as Record<string, unknown>)['content-type'];
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status !== 401 || typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const href = window.location.href;
    const path = window.location.pathname || '';
    const isAuthPage = href.includes('/sign-in') || href.includes('/sign-up');
    /** На странице комнаты гость и истёкшая сессия получают 401 от validate/chat — без редиректа на вход */
    const onRoomPage = path.startsWith('/room/');
    const reqUrl = String((error.config as { url?: string })?.url ?? '');
    const isSessionProbe = reqUrl.includes('/auth/validate');

    if (!isAuthPage && !onRoomPage && !isSessionProbe) {
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);
