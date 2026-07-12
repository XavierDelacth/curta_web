import { useEffect, useState, useCallback } from 'react';
import { Clock, Search } from 'lucide-react';
import { adminService } from '@/api/admin-service';
import { SystemLogOut } from '@/types';

const LOG_TYPES = ['Todos', 'autenticacao', 'upload', 'moderacao', 'erro'] as const;
const TYPE_LABEL: Record<string, string> = { autenticacao: 'Auth', upload: 'Upload', moderacao: 'Moderação', erro: 'Erro' };
const TYPE_COLOR: Record<string, string> = { autenticacao: 'text-blue-600 bg-blue-100', upload: 'text-green-600 bg-green-100', moderacao: 'text-yellow-600 bg-yellow-100', erro: 'text-red-600 bg-red-100' };
const PERIODS = [{ key: 'all', label: 'Tudo' }, { key: '1d', label: 'Hoje' }, { key: '7d', label: '7 dias' }, { key: '30d', label: '30 dias' }] as const;

function formatDate(iso: string) { return new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }

export default function AdminLogs() {
  const [logs, setLogs] = useState<SystemLogOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [logType, setLogType] = useState<string>('Todos');
  const [period, setPeriod] = useState('all');

  const loadLogs = useCallback(() => {
    setLoading(true);
    const dataInicio = period === 'all' ? undefined : new Date(Date.now() - (period === '1d' ? 86400000 : period === '7d' ? 604800000 : 2592000000)).toISOString();
    adminService.getLogs({ tipo_evento: logType === 'Todos' ? undefined : logType, data_inicio: dataInicio })
      .then(setLogs).catch(() => setLogs([])).finally(() => setLoading(false));
  }, [logType, period]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = query ? logs.filter((l) => l.descricao.toLowerCase().includes(query.toLowerCase())) : logs;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Clock className="w-6 h-6" /> Logs</h1>

      <div className="flex items-center gap-2 mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
        <Search className="w-5 h-5 text-neutral-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar logs..." className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {LOG_TYPES.map((t) => (
          <button key={t} onClick={() => setLogType(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${logType === t ? 'bg-brand-red text-white border-brand-red' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
            {t === 'Todos' ? 'Todos' : (TYPE_LABEL[t] ?? t)}
          </button>
        ))}
        <span className="w-px bg-neutral-300 dark:bg-neutral-600 mx-1" />
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${period === p.key ? 'bg-brand-gold text-white border-brand-gold' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <div key={l.id} className="flex items-start gap-3 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{l.descricao || l.tipo_evento}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[l.tipo_evento] ?? 'text-neutral-500 bg-neutral-100'}`}>{TYPE_LABEL[l.tipo_evento] ?? l.tipo_evento}</span>
                  {l.ip_address && <span className="text-xs text-neutral-400">{l.ip_address}</span>}
                </div>
                <p className="text-xs text-neutral-400 mt-1">{formatDate(l.criado_em)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}