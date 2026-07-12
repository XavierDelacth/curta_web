import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadService } from '@/api/download-service';
import { DownloadOut } from '@/types';

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    downloadService.getDownloads().then(setDownloads).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRemove = async (curtaId: string) => {
    await downloadService.removeDownload(curtaId);
    setDownloads((prev) => prev.filter((d) => d.curta_id !== curtaId));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/perfil" className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-xl font-bold flex items-center gap-2"><Download className="w-5 h-5" /> Downloads</h1>
      </div>

      {downloads.length === 0 ? (
        <p className="text-center text-neutral-500 py-12">Sem downloads.</p>
      ) : (
        <div className="space-y-2">
          {downloads.filter((d) => !d.eliminado_em).map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
              <Download className="w-5 h-5 text-brand-red" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Curta {d.curta_id.slice(0, 8)}</p>
                <p className="text-xs text-neutral-500">{new Date(d.descarregado_em).toLocaleDateString('pt-PT')}</p>
              </div>
              <button onClick={() => handleRemove(d.curta_id)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
