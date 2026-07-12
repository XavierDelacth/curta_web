import { CurtaOut, Film, UserOut, VisualizacaoOut } from '@/types';
import api from './http-client';

interface UpdateProfilePayload {
  nome?: string;
  email?: string;
}

interface ChangePasswordPayload {
  senha_atual: string;
  nova_senha: string;
}

export const userService = {
  getProfile: () => api.get<UserOut>('/users/me').then((r) => r.data),

  updateProfile: (userId: string, payload: UpdateProfilePayload) =>
    api.put<UserOut>(`/users/${userId}`, payload).then((r) => r.data),

  changePassword: (payload: ChangePasswordPayload) =>
    api.put('/users/me/password', payload).then((r) => r.data),

  getUserFilms: async (userId: string): Promise<Film[]> => {
    const { data: all } = await api.get<CurtaOut[]>('/curtas/');
    return all
      .filter((c) => c.autor_id === userId)
      .map((c) => ({ ...c, capa_url: c.capa_path, capa_importada_url: c.capa_importada_path }));
  },

  getHistory: () => api.get<VisualizacaoOut[]>('/streaming/historico').then((r) => r.data),

  getProgress: (curtaId: string) =>
    api.get<VisualizacaoOut>(`/streaming/${curtaId}/progress`).then((r) => r.data),

  updateProgress: (curtaId: string, percentagem_assistida: number) =>
    api.put<VisualizacaoOut>(`/streaming/${curtaId}/progress`, { percentagem_assistida }).then((r) => r.data),

  getStats: () =>
    api.get<{ total_uploads: number; total_favoritos: number; total_comentarios: number }>('/users/me/stats').then((r) => r.data),

  getSolicitacao: () =>
    api.get('/users/me/solicitar-permissao').then((r) => r.data),

  criarSolicitacao: () =>
    api.post('/users/me/solicitar-permissao').then((r) => r.data),

  eliminarSolicitacao: () =>
    api.delete('/users/me/solicitar-permissao').then((r) => r.data),
};
