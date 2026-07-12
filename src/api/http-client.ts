import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';

export const BASE_URL = '/api/v1';
const MEDIA_BASE = '';

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${MEDIA_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Erro ${status}`);
  }
}

function friendlyMessage(status: number): string {
  if (status === 400) return 'Os dados enviados são inválidos. Verifique e tente novamente.';
  if (status === 404) return 'O recurso solicitado não foi encontrado.';
  if (status === 409) return 'Este registo já existe.';
  if (status === 413) return 'O ficheiro é demasiado grande.';
  if (status === 422) return 'Os dados enviados são inválidos. Verifique e tente novamente.';
  if (status === 429) return 'Demasiados pedidos. Aguarde um momento e tente novamente.';
  if (status >= 500) return 'Erro no servidor. Tente novamente mais tarde.';
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    const status = error.response?.status ?? 0;
    const data = error.response?.data;
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? String((data as Record<string, unknown>).detail)
        : undefined;
    throw new HttpError(status, data, detail ?? friendlyMessage(status));
  },
);

export default api;
