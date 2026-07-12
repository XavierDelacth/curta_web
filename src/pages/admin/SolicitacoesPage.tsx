import { useEffect, useState, useCallback } from 'react';
import { FileText, Check, X, Clock } from 'lucide-react';
import { adminService } from '@/api/admin-service';

const ESTADO_LABEL: Record<string, string> = { pendente: 'Pendente', aceite: 'Aceite', rejeitado: 'Rejeitado' };
const ESTADO_COLOR: Record<string, string> = { pendente: 'text-yellow-600 bg-yellow-100', aceite: 'text-green-600 bg-green-100', rejeitado: 'text-red-600 bg-red-100' };

export default function AdminSolicitacoes() {
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendente');

  const load = useCallback(() => {
    setLoading(true);
    adminService.getSolicitacoes(filter).then(setSolicitacoes).catch(() => setSolicitacoes([])).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    await adminService.aprovarSolicitacao(id);
    load();
  };

  const handleReject = async (id: string) => {
    await adminService.rejeitarSolicitacao(id);
    load();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><FileText className="w-6 h-6" /> Solicitações</h1>

      <div className="flex gap-2 mb-4">
        {['pendente', 'aceite', 'rejeitado', 'todos'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>
      ) : solicitacoes.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">Sem solicitações.</p>
      ) : (
        <div className="space-y-2">
          {solicitacoes.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{s.utilizador_nome ?? 'Utilizador'}</p>
                <p className="text-xs text-neutral-500">{s.utilizador_email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[s.estado] ?? ''}`}>
                    {ESTADO_LABEL[s.estado] ?? s.estado}
                  </span>
                  <span className="text-xs text-neutral-400">{new Date(s.criado_em).toLocaleDateString('pt-PT')}</span>
                </div>
              </div>
              {s.estado === 'pendente' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(s.id)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleReject(s.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}