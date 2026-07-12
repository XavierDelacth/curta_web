import { useEffect, useState, useCallback } from 'react';
import { FileText, Check, X } from 'lucide-react';
import { adminService } from '@/api/admin-service';

interface SolicitacaoItem {
  id: string;
  estado: string;
  criado_em: string;
  respondido_em: string | null;
  motivo_rejeicao: string | null;
  utilizador_id: string;
  utilizador_nome: string;
  utilizador_email: string;
}

const FILTROS = ['pendente', 'aceite', 'rejeitado', 'todos'] as const;
const ESTADO_LABEL: Record<string, string> = { pendente: 'Pendente', aceite: 'Aceite', rejeitado: 'Rejeitado' };
const ESTADO_COLOR: Record<string, string> = { pendente: 'text-yellow-600 bg-yellow-100', aceite: 'text-green-600 bg-green-100', rejeitado: 'text-red-600 bg-red-100' };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSolicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [rejeitarId, setRejeitarId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminService.getSolicitacoes(filter).then((res: any) => {
      setSolicitacoes(res.solicitacoes ?? res ?? []);
    }).catch(() => setSolicitacoes([])).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    try {
      await adminService.aprovarSolicitacao(id);
      load();
    } catch (e: any) {
      alert(e?.message ?? 'Não foi possível aprovar.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await adminService.rejeitarSolicitacao(id, motivo || undefined);
      setRejeitarId(null);
      setMotivo('');
      load();
    } catch (e: any) {
      alert(e?.message ?? 'Não foi possível rejeitar.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><FileText className="w-6 h-6" /> Solicitações</h1>

      <div className="flex gap-2 mb-4">
        {FILTROS.map((f) => (
          <button key={f} onClick={() => { setFilter(f); setRejeitarId(null); setMotivo(''); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
            {f === 'pendente' ? 'Pendentes' : f === 'aceite' ? 'Aceites' : f === 'rejeitado' ? 'Rejeitadas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>
      ) : solicitacoes.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">Sem solicitações.</p>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map((s) => (
            <div key={s.id} className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.utilizador_nome ?? 'Utilizador'}</p>
                  <p className="text-xs text-neutral-500">{s.utilizador_email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[s.estado] ?? ''}`}>
                      {ESTADO_LABEL[s.estado] ?? s.estado}
                    </span>
                    <span className="text-xs text-neutral-400">Solicitado: {formatDate(s.criado_em)}</span>
                    {s.respondido_em && (
                      <span className="text-xs text-neutral-400">Respondido: {formatDate(s.respondido_em)}</span>
                    )}
                  </div>
                  {s.motivo_rejeicao && (
                    <p className="text-xs text-red-500 mt-1">Motivo: {s.motivo_rejeicao}</p>
                  )}
                </div>
                {s.estado === 'pendente' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleApprove(s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button onClick={() => setRejeitarId(rejeitarId === s.id ? null : s.id)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-semibold">
                      <X className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                )}
              </div>

              {rejeitarId === s.id && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo da rejeição (opcional)"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-sm outline-none focus:ring-2 focus:ring-brand-red/50"
                    maxLength={500}
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleReject(s.id)}
                      className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">
                      Confirmar rejeição
                    </button>
                    <button onClick={() => { setRejeitarId(null); setMotivo(''); }}
                      className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}