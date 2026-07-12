import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Play } from 'lucide-react';
import { userService } from '@/api/user-service';
import { VisualizacaoOut } from '@/types';
import { mediaUrl } from '@/api/http-client';

export default function HistoryPage() {
  const [history, setHistory] = useState<VisualizacaoOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.getHistory().then(setHistory).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/perfil" className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5" /> Histórico</h1>
      </div>

      {history.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">Sem histórico de visualização.</p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => (
            <Link key={h.id} to={`/filme/${h.curta_id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <div className="w-24 h-14 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Curta {h.curta_id.slice(0, 8)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-red rounded-full" style={{ width: `${h.percentagem_assistida}%` }} />
                  </div>
                  <span className="text-xs text-neutral-500">{Math.round(h.percentagem_assistida)}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
