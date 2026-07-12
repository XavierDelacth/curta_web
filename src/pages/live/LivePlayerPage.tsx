import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { liveService } from '@/api/live-service';
import { LiveDetail } from '@/types';
import LivePlayer from '@/components/live/LivePlayer';

export default function LivePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveDetail | null>(null);
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    if (!id) return;
    liveService.obter(id).then(setLive).catch(() => navigate('/'));
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      liveService.obterViewers(id).then((d) => setViewers(d.total)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 flex-1">
          <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative rounded-full h-2.5 w-2.5 bg-red-500" /></span>
          <h1 className="text-lg font-bold">{live?.titulo ?? 'AO VIVO'}</h1>
        </div>
        <span className="flex items-center gap-1 text-sm text-neutral-500"><Users className="w-4 h-4" /> {viewers}</span>
      </div>

      {live && <LivePlayer live={live} />}

      {live && (
        <div className="mt-4">
          <p className="text-sm text-neutral-500">Por {live.criador_nome}</p>
          {live.descricao && <p className="text-sm mt-1">{live.descricao}</p>}
        </div>
      )}
    </div>
  );
}
