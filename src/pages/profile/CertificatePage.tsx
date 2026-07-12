import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Shield, Download, Trash2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { certificateService, CertificateStatus } from '@/api/certificate-service';

export default function CertificatePage() {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<CertificateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStatus = useCallback(() => {
    certificateService.getStatus().then(setStatus).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleEmitir = async () => {
    setActionLoading(true);
    try { await certificateService.emitir(); loadStatus(); } catch {} finally { setActionLoading(false); }
  };

  const handleRevogar = async () => {
    setActionLoading(true);
    try { await certificateService.revogar(); loadStatus(); } catch {} finally { setActionLoading(false); }
  };

  const handleDownload = async () => {
    try { await certificateService.downloadPFX(user?.nome ?? 'user'); } catch {}
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/perfil" className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5" /> Certificado Digital</h1>
      </div>

      {status?.tem_certificado && status.certificado ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">Certificado Ativo</span>
            </div>
            <div className="text-sm space-y-1 text-neutral-600 dark:text-neutral-400">
              <p>Série: {status.certificado.serial_number}</p>
              <p>Emitido: {new Date(status.certificado.emitido_em).toLocaleDateString('pt-PT')}</p>
              <p>Válido até: {new Date(status.certificado.valido_ate).toLocaleDateString('pt-PT')}</p>
              <p>Dias restantes: {status.certificado.dias_restantes}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark">
              <Download className="w-4 h-4" /> Descarregar PFX
            </button>
            <button onClick={handleRevogar} disabled={actionLoading}
              className="px-4 py-2.5 border border-red-300 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-500 mb-4">Não tem certificado digital. O certificado é necessário para publicar filmes.</p>
          <button onClick={handleEmitir} disabled={actionLoading}
            className="px-6 py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
            {actionLoading ? 'A emitir...' : 'Emitir Certificado'}
          </button>
        </div>
      )}

      <div className="mt-6">
        <a href={certificateService.getCACertUrl()} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-sm text-brand-red font-medium hover:underline">
          <ExternalLink className="w-4 h-4" /> Descarregar certificado CA
        </a>
      </div>
    </div>
  );
}
