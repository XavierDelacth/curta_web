import { DownloadOut } from '@/types';
import api, { BASE_URL } from './http-client';
import { useAuthStore } from '@/stores/auth-store';

export const downloadService = {
  getDownloads: () => api.get<DownloadOut[]>('/download/').then((r) => r.data),

  registerDownload: (curtaId: string) =>
    api.post<DownloadOut>(`/download/${curtaId}`).then((r) => r.data),

  getDownloadFile: (curtaId: string, desencriptar = false) =>
    `${BASE_URL}/download/${curtaId}?desencriptar=${desencriptar}`,

  removeDownload: (curtaId: string) =>
    api.delete(`/download/${curtaId}`).then((r) => r.data),

  downloadAndSave: async (curtaId: string, filename: string): Promise<void> => {
    const token = useAuthStore.getState().accessToken;
    const url = `${BASE_URL}/download/${curtaId}?desencriptar=false`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Não foi possível fazer o download.');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${filename}.curta`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  },
};
