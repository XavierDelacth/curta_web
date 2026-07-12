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

  /** Envia SDP offer WHEP para o backend proxy e obtém SDP answer. */
  enviarOfertaWhep: async (liveId: string, sdp: string): Promise<{ sdp: string; location: string }> => {
    const token = useAuthStore.getState().accessToken;
    const resp = await fetch(`${BASE_URL}/live/${liveId}/whep`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/sdp',
      },
      body: sdp,
    });
    const answer = await resp.text();
    const location = resp.headers.get('Location') ?? '';
    return { sdp: answer, location };
  },

  /** Termina sessão WHEP no servidor. */
  terminarWhep: async (liveId: string, location?: string) => {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (location) headers['Location'] = location;
    await fetch(`${BASE_URL}/live/${liveId}/whep`, {
      method: 'DELETE',
      headers,
    });
  },
};
