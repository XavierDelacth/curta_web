import { LiveCreateRequest, LiveDetail, LiveIniciarResponse, LiveOut } from '@/types';
import api, { BASE_URL } from './http-client';
import { useAuthStore } from '@/stores/auth-store';

export const liveService = {
  listarAtivas: () => api.get<LiveOut[]>('/live/').then((r) => r.data),

  iniciar: (data: LiveCreateRequest) =>
    api.post<LiveIniciarResponse>('/live/iniciar', data).then((r) => r.data),

  terminar: (liveId: string) =>
    api.post<{ mensagem: string }>(`/live/${liveId}/terminar`).then((r) => r.data),

  obter: (liveId: string) =>
    api.get<LiveDetail>(`/live/${liveId}`).then((r) => r.data),

  pushChunk: async (liveId: string, blob: Blob) => {
    const token = useAuthStore.getState().accessToken;
    return fetch(`${BASE_URL}/live/${liveId}/push-chunk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: blob,
    });
  },

  finishPush: (liveId: string) =>
    api.post(`/live/${liveId}/finish-push`).then((r) => r.data),

  obterViewers: (liveId: string) =>
    api.get<{ total: number }>(`/live/${liveId}/viewers`).then((r) => r.data),
};
