import { useEffect, useState, useCallback } from 'react';
import { Film, Search, Trash2 } from 'lucide-react';
import { catalogService } from '@/api/catalog-service';
import { adminService } from '@/api/admin-service';
import { CurtaOut } from '@/types';

const STATUS_LABEL: Record<string, string> = { publicado: 'Publicado', rascunho: 'Rascunho', a_processar: 'A processar', erro: 'Erro' };
const STATUS_COLOR: Record<string, string> = { publicado: 'text-green-600 bg-green-100', rascunho: 'text-yellow-600 bg-yellow-100', a_processar: 'text-blue-600 bg-blue-100', erro: 'text-red-600 bg-red-100' };

export default function AdminContent() {
  const [films, setFilms] = useState<CurtaOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CurtaOut | null>(null);

  useEffect(() => {
    catalogService.getFilms().then((r) => setFilms(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = films.filter((f) => f.titulo.toLowerCase().includes(query.toLowerCase()));

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try { await adminService.deleteCurta(deleteTarget.id); setFilms((p) => p.filter((f) => f.id !== deleteTarget.id)); } catch {} finally { setDeleteTarget(null); }
  }, [deleteTarget]);

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Film className="w-6 h-6" /> Conteúdos</h1>

      <div className="flex items-center gap-2 mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
        <Search className="w-5 h-5 text-neutral-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar..." className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      <div className="space-y-2">
        {filtered.map((f) => (
          <div key={f.id} className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl">
            <div className="w-16 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <Film className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{f.titulo}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[f.status] ?? ''}`}>{STATUS_LABEL[f.status] ?? f.status}</span>
                <span className="text-xs text-neutral-500">{f.visualizacoes} views</span>
              </div>
            </div>
            <button onClick={() => setDeleteTarget(f)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Eliminar curta?</h3>
            <p className="text-sm text-neutral-500 mb-4">Eliminar "{deleteTarget.titulo}" permanentemente?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}