import { create } from 'zustand';
import { authService } from '@/api/auth-service';
import { UserOut } from '@/types';

const TOKEN_KEY = 'curta_access_token';
const REFRESH_TOKEN_KEY = 'curta_refresh_token';
const USER_KEY = 'curta_user';

interface AuthState {
  user: UserOut | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, senha: string) => Promise<string | null>;
  register: (nome: string, email: string, senha: string, role_id: string) => Promise<void>;
  logout: () => void;
  updateUser: (updated: UserOut) => void;
  initialize: () => Promise<void>;
}

function decodeRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

function persistSession(accessToken: string, refreshToken: string, user: UserOut) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as UserOut;
        const role = decodeRole(token);
        set({ user, accessToken: token, refreshToken: refresh, role, isAuthenticated: true, isLoading: false });
      } catch {
        clearSession();
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, senha) => {
    const session = await authService.login({ email, senha });
    persistSession(session.tokens.access_token, session.tokens.refresh_token, session.user);
    const role = decodeRole(session.tokens.access_token);
    // Fetch full profile
    try {
      const fullUser = await authService.getMe();
      persistSession(session.tokens.access_token, session.tokens.refresh_token, fullUser);
      set({ user: fullUser, accessToken: session.tokens.access_token, refreshToken: session.tokens.refresh_token, role, isAuthenticated: true });
    } catch {
      set({ user: session.user, accessToken: session.tokens.access_token, refreshToken: session.tokens.refresh_token, role, isAuthenticated: true });
    }
    return role;
  },

  register: async (nome, email, senha, role_id) => {
    const session = await authService.register({ nome, email, senha, role_id });
    persistSession(session.tokens.access_token, session.tokens.refresh_token, session.user);
    const role = decodeRole(session.tokens.access_token);
    try {
      const fullUser = await authService.getMe();
      persistSession(session.tokens.access_token, session.tokens.refresh_token, fullUser);
      set({ user: fullUser, accessToken: session.tokens.access_token, refreshToken: session.tokens.refresh_token, role, isAuthenticated: true });
    } catch {
      set({ user: session.user, accessToken: session.tokens.access_token, refreshToken: session.tokens.refresh_token, role, isAuthenticated: true });
    }
  },

  logout: () => {
    authService.logout().catch(() => {});
    clearSession();
    set({ user: null, accessToken: null, refreshToken: null, role: null, isAuthenticated: false });
  },

  updateUser: (updated) => {
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    set({ user: updated });
  },
}));
