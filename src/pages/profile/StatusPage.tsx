import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, UserCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { userService } from '@/api/user-service';

export default function StatusPage() {
  const { user, role } = useAuthStore();
  const [solicitacao, setSolicitacao] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    userService.getSolicitacao().then(setSolicitacao).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRequest = useCallback(async () => {
    setRequesting(true);
    try {
      const s = await userService.criarSolicitacao();
      setSolicitacao(s);
    } catch {} finally { setRequesting(false); }
  }, []);

  const handleCancel = useCallback(async () => {
    try {
      await userService.eliminarSolicitacao();
      setSolicitacao(null);
    } catch {}
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

        {role === 'espectador' && (
          <div className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><UserCheck className="w-5 h-5" /> Tornar-se realizador</h3>
            <p className="text-sm text-neutral-500 mb-4">Solicite a permissão para publicar curtas-metragens na plataforma.</p>

            {solicitacao ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  solicitacao.estado === 'pendente' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700' :
                  solicitacao.estado === 'aceite' ? 'bg-green-50 dark:bg-green-900/20 text-green-700' :
                  'bg-red-50 dark:bg-red-900/20 text-red-700'
                }`}>
                  {solicitacao.estado === 'pendente' && <Clock className="w-4 h-4" />}
                  {solicitacao.estado === 'aceite' && <CheckCircle className="w-4 h-4" />}
                  {solicitacao.estado === 'rejeitado' && <XCircle className="w-4 h-4" />}
                  <span className="capitalize">{solicitacao.estado}</span>
                </div>
                {solicitacao.estado !== 'aceite' && (
                  <button onClick={handleCancel} className="text-sm text-red-500 hover:underline">Cancelar solicitação</button>
                )}
              </div>
            ) : (
              <button onClick={handleRequest} disabled={requesting}
                className="w-full py-2.5 bg-brand-red text-white rounded-xl font-semibold hover:bg-brand-red-dark disabled:opacity-50">
                {requesting ? 'A solicitar...' : 'Solicitar'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
