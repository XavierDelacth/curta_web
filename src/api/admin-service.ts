import { DashboardStats, PermissaoOut, RoleOut, SystemLogOut, UserOut } from '@/types';
import api from './http-client';

export const adminService = {
  getDashboard: () => api.get<DashboardStats>('/admin/dashboard').then((r) => r.data),

  getUsers: (params?: { q?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString();
    return api.get<UserOut[]>(`/admin/utilizadores${query ? `?${query}` : ''}`).then((r) => r.data);
  },

  blockUser: (userId: string) =>
    api.put<UserOut>(`/admin/utilizadores/${userId}/bloquear`).then((r) => r.data),

  unblockUser: (userId: string) =>
    api.put<UserOut>(`/admin/utilizadores/${userId}/desbloquear`).then((r) => r.data),

  createUser: (data: { nome: string; email: string; senha: string; role_id: string }) =>
    api.post('/auth/register', data).then((r) => r.data),

  deleteCurta: (curtaId: string) =>
    api.delete(`/admin/curtas/${curtaId}`).then((r) => r.data),

  getLogs: (params?: {
    utilizador_id?: string;
    tipo_evento?: string;
    data_inicio?: string;
    data_fim?: string;
    limite?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.utilizador_id) qs.set('utilizador_id', params.utilizador_id);
    if (params?.tipo_evento) qs.set('tipo_evento', params.tipo_evento);
    if (params?.data_inicio) qs.set('data_inicio', params.data_inicio);
    if (params?.data_fim) qs.set('data_fim', params.data_fim);
    qs.set('limite', String(params?.limite ?? 100));
    qs.set('offset', String(params?.offset ?? 0));
    return api.get<SystemLogOut[]>(`/admin/logs?${qs.toString()}`).then((r) => r.data);
  },

  getPapeis: () => api.get<RoleOut[]>('/admin/papeis').then((r) => r.data),

  criarPapel: (nome: string, descricao?: string) =>
    api.post<RoleOut>('/admin/papeis', { nome, descricao }).then((r) => r.data),

  getPermissoes: () => api.get<PermissaoOut[]>('/admin/permissoes').then((r) => r.data),

  criarPermissao: (recurso: string, acao: string) =>
    api.post<PermissaoOut>('/admin/permissoes', { recurso, acao }).then((r) => r.data),

  getPermissoesDoPapel: (roleId: string) =>
    api.get<PermissaoOut[]>(`/admin/papeis/${roleId}/permissoes`).then((r) => r.data),

  atribuirPermissoes: (roleId: string, permission_ids: string[]) =>
    api.put<PermissaoOut[]>(`/admin/papeis/${roleId}/permissoes`, { permission_ids }).then((r) => r.data),

  getSolicitacoes: (estado?: string) => {
    const qs = estado && estado !== 'todos' ? `?estado=${estado}` : '?estado=todos';
    return api.get(`/admin/solicitacoes${qs}`).then((r) => r.data);
  },

  aprovarSolicitacao: (id: string) =>
    api.put(`/admin/solicitacoes/${id}/aprovar`).then((r) => r.data),

  rejeitarSolicitacao: (id: string, motivo?: string) =>
    api.put(`/admin/solicitacoes/${id}/rejeitar`, motivo ? { motivo_rejeicao: motivo } : {}).then((r) => r.data),
};
