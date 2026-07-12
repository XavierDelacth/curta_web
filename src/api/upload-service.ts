import { CurtaOut, CurtaStatusOut, FilmPayload } from '@/types';
import api, { BASE_URL } from './http-client';
import { useAuthStore } from '@/stores/auth-store';
import { catalogService } from './catalog-service';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

function xhrUpload(
  method: 'POST' | 'PUT',
  path: string,
  formData: FormData,
  onProgress?: (p: UploadProgress) => void,
): Promise<CurtaStatusOut | void> {
  const token = useAuthStore.getState().accessToken;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({ loaded: e.loaded, total: e.total, percentage: Math.round((e.loaded / e.total) * 100) });
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as CurtaStatusOut); } catch { resolve(); }
      } else {
        reject(new Error(`Erro ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede'));
    xhr.open(method, `${BASE_URL}${path}`);
    xhr.timeout = 600000;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

export const uploadService = {
  async createCurta(payload: FilmPayload): Promise<CurtaOut> {
    const { data } = await api.post<CurtaOut>('/curtas/', {
      titulo: payload.titulo,
      descricao: payload.descricao,
      categoria_id: payload.categoriaId,
      tags: payload.tagIds.length > 0 ? payload.tagIds : undefined,
    });
    return data;
  },

  async uploadVideo(curtaId: string, videoFile: File, onProgress?: (p: UploadProgress) => void): Promise<CurtaStatusOut> {
    const formData = new FormData();
    formData.append('file', videoFile, videoFile.name || 'video.mp4');
    const result = await xhrUpload('POST', `/curtas/${curtaId}/upload`, formData, onProgress);
    return result as CurtaStatusOut;
  },

  async uploadCapa(curtaId: string, capaFile: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', capaFile, 'capa.jpg');
    await xhrUpload('PUT', `/curtas/${curtaId}/capa`, formData);
  },

  async checkCurtaStatus(curtaId: string): Promise<CurtaStatusOut> {
    const { data } = await api.get<CurtaStatusOut>(`/curtas/${curtaId}/status`);
    return data;
  },

  waitForPublished(curtaId: string, onProcessing?: (elapsed: number) => void, timeoutMs = 600000): Promise<CurtaOut> {
    return new Promise((resolve, reject) => {
      let cancelled = false;
      const start = Date.now();
      let pollCount = 0;

      const poll = async () => {
        if (cancelled) return;
        const elapsed = Date.now() - start;
        if (elapsed > timeoutMs) {
          reject(new Error('O processamento demorou demasiado tempo. Verifique mais tarde se o vídeo foi publicado.'));
          return;
        }
        try {
          const { status } = await uploadService.checkCurtaStatus(curtaId);
          if (status === 'publicado') {
            const film = await catalogService.getFilm(curtaId);
            resolve(film);
          } else if (status === 'erro') {
            reject(new Error('O processamento do vídeo falhou.'));
          } else {
            pollCount++;
            onProcessing?.(Math.floor(elapsed / 1000));
            setTimeout(poll, Math.min(2000 + pollCount * 100, 5000));
          }
        } catch (err) {
          if (elapsed > 30000) {
            reject(new Error('Não foi possível verificar o estado do processamento.'));
          } else {
            setTimeout(poll, 2000);
          }
        }
      };
      poll();
      return () => { cancelled = true; };
    });
  },

  async uploadFilm(
    videoFile: File,
    capaFile: File | null,
    payload: FilmPayload,
    onProgress?: (p: UploadProgress) => void,
    onProcessing?: (elapsed: number) => void,
  ): Promise<CurtaOut> {
    const curta = await this.createCurta(payload);
    if (capaFile) {
      await this.uploadCapa(curta.id, capaFile).catch(() => {});
    }
    await this.uploadVideo(curta.id, videoFile, onProgress);
    return this.waitForPublished(curta.id, onProcessing);
  },

  updateFilm: (filmId: string, payload: Partial<FilmPayload>) =>
    api.put<CurtaOut>(`/curtas/${filmId}`, {
      titulo: payload.titulo,
      descricao: payload.descricao,
      categoria_id: payload.categoriaId,
    }).then((r) => r.data),

  deleteFilm: (filmId: string) => api.delete(`/curtas/${filmId}`).then((r) => r.data),
};
