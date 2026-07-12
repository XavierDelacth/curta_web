import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { userService } from '@/api/user-service';
import { authService } from '@/api/auth-service';

interface SolicitacaoData {
  id: string;
  estado: 'pendente' | 'aceite' | 'rejeitado';
  criado_em: string;
  respondido_em?: string | null;
  motivo_rejeicao?: string | null;
}

export default function StatusPage() {
  const { user, role, refreshToken, updateUser } = useAuthStore();
  const [solicitacao, setSolicitacao] = useState<SolicitacaoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const podeSolicitar = role !== 'realizador' && role !== 'admin' && role !== 'administrador';

  const fetchSolicitacao = useCallback(async () => {
    try {
      const res = await userService.getSolicitacao() as { solicitacao: SolicitacaoData | null };
      setSolicitacao(res.solicitacao ?? null);
      return res.solicitacao ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetchSolicitacao().finally(() => setLoading(false));
  }, [fetchSolicitacao]);

  // Polling quando pendente
  useEffect(() => {
    if (solicitacao?.estado !== 'pendente') {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    pollingRef.current = setInterval(async () => {
      const nova = await fetchSolicitacao();
      if (nova?.estado === 'aceite' && refreshToken) {
        try {
          const tokens = await authService.refreshToken(refreshToken);
          localStorage.setItem('curta_access_token', tokens.access_token);
          localStorage.setItem('curta_refresh_token', tokens.refresh_token);
          const fullUser = await authService.getMe();
          updateUser(fullUser);
          window.location.reload();
        } catch {}
      }
    }, 15000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [solicitacao?.estado, fetchSolicitacao, refreshToken, updateUser]);

  // Refresh on mount se já aceite
  useEffect(() => {
    if (solicitacao?.estado === 'aceite' && podeSolicitar && refreshToken) {
      (async () => {
        try {
          const tokens = await authService.refreshToken(refreshToken);
          localStorage.setItem('curta_access_token', tokens.access_token);
          localStorage.setItem('curta_refresh_token', tokens.refresh_token);
          const fullUser = await authService.getMe();
          updateUser(fullUser);
          window.location.reload();
        } catch {}
      })();
    }
  }, [solicitacao?.estado, podeSolicitar, refreshToken, updateUser]);

  const handleRequest = useCallback(async () => {
    setRequesting(true);
    try {
      const res = await userService.criarSolicitacao() as { mensagem: string; solicitacao: SolicitacaoData };
      setSolicitacao(res.solicitacao);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao solicitar permissão.');
    } finally { setRequesting(false); }
  }, []);

  const handleCancel = useCallback(async () => {
    try {
      await userService.eliminarSolicitacao();
      setSolicitacao(null);
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao eliminar solicitação.');
    }
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/perfil" className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold">Estado da Conta</h1>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">Conta</span>
            <span className="text-sm font-semibold flex items-center gap-1">
              {user?.status === 'ativo' ? <><CheckCircle className="w-4 h-4 text-green-500" /> Ativa</> : <><XCircle className="w-4 h-4 text-red-500" /> Bloqueada</>}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-neutral-500">Papel</span>
            <span className="text-sm font-semibold capitalize">{role ?? 'desconhecido'}</span>
          </div>
        </div>

        {podeSolicitar && (
          <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><UserCheck className="w-5 h-5" /> Tornar-se realizador</h3>
            <p className="text-sm text-neutral-500 mb-4">Solicite a permissão para publicar curtas-metragens na plataforma.</p>

            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-red" />
              </div>
            ) : solicitacao ? (
              <div className="space-y-3">
                {solicitacao.estado === 'pendente' && (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Solicitação Pendente…</span>
                    </div>
                    <button onClick={handleCancel} className="w-full py-2.5 border border-red-300 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20">Cancelar solicitação</button>
                  </>
                )}
                {solicitacao.estado === 'aceite' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 text-sm border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span>Solicitação aprovada! Já és realizador.</span>
                  </div>
                )}
                {solicitacao.estado === 'rejeitado' && (
                  <>
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-600 font-medium">A tua solicitação foi recusada.</p>
                      {solicitacao.motivo_rejeicao && (
                        <p className="text-xs text-red-500 mt-1">Motivo: {solicitacao.motivo_rejeicao}</p>
                      )}
                    </div>
                    <button onClick={handleCancel} className="w-full py-2.5 border border-red-300 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20">Eliminar solicitação</button>
                  </>
                )}
              </div>
            ) : (
              <button onClick={handleRequest} disabled={requesting}
                className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
                {requesting ? 'A solicitar...' : 'Solicitar permissão de Realizador'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
