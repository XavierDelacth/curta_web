import { AuthSession, AuthTokens, TokenResponse, UserOut } from '@/types';
import api from './http-client';

interface LoginPayload {
  email: string;
  senha: string;
}

interface RegisterPayload {
  nome: string;
  email: string;
  senha: string;
  role_id: string;
}

function decodeToken(token: string): { role: string; sub: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return { role: decoded.role, sub: decoded.sub };
  } catch {
    return null;
  }
}

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthSession> => {
    const { data: res } = await api.post<TokenResponse>('/auth/login', payload);
    const decoded = decodeToken(res.access_token);
    const user: UserOut = {
      id: decoded?.sub ?? '',
      nome: payload.email.split('@')[0],
      email: payload.email,
      role_id: '',
      status: 'ativo',
      criado_em: new Date().toISOString(),
    };
    return { user, tokens: { access_token: res.access_token, refresh_token: res.refresh_token } };
  },

  register: async (payload: RegisterPayload): Promise<AuthSession> => {
    const { data: res } = await api.post<TokenResponse>('/auth/register', payload);
    const decoded = decodeToken(res.access_token);
    const user: UserOut = {
      id: decoded?.sub ?? '',
      nome: payload.nome,
      email: payload.email,
      role_id: payload.role_id,
      status: 'ativo',
      criado_em: new Date().toISOString(),
    };
    return { user, tokens: { access_token: res.access_token, refresh_token: res.refresh_token } };
  },

  logout: () => api.post('/auth/logout'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  refreshToken: (refresh_token: string) =>
    api.post<TokenResponse>('/auth/refresh', { refresh_token }),

  getMe: () => api.get<UserOut>('/users/me').then((r) => r.data),
};
