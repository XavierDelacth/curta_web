import api, { BASE_URL } from './http-client';
import { useAuthStore } from '@/stores/auth-store';

export interface CertificateStatus {
  tem_certificado: boolean;
  certificado: {
    serial_number: string;
    common_name: string;
    emitido_em: string;
    valido_ate: string;
    revogado: boolean;
    dias_restantes: number;
  } | null;
}

export interface CertificateEmitidoResponse {
  mensagem: string;
  serial_number: string;
  common_name: string;
  emitido_em: string;
  valido_ate: string;
  download_url: string;
}

export const certificateService = {
  getStatus: () => api.get<CertificateStatus>('/certificates/status').then((r) => r.data),

  emitir: () => api.post<CertificateEmitidoResponse>('/certificates/emitir', {}).then((r) => r.data),

  revogar: () => api.post<{ mensagem: string }>('/certificates/revogar', {}).then((r) => r.data),

  downloadPFX: async (nomeUtilizador: string) => {
    const token = useAuthStore.getState().accessToken;
    const response = await fetch(`${BASE_URL}/certificates/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Erro ao descarregar certificado.');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `curtastream_${nomeUtilizador.replace(/\s+/g, '_')}.pfx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  },

  getCACertUrl: () => `${BASE_URL}/certificates/ca.crt`,
};
