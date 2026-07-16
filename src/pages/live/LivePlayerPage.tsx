import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import axios from 'axios';
import { liveService } from '@/api/live-service';
import { LiveDetail } from '@/types';
import LivePlayer from '@/components/live/LivePlayer';

export default function LivePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveDetail | null>(null);
  const [viewers, setViewers] = useState(0);
  const [ended, setEnded] = useState(false);
  const viewersIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    liveService.obter(id).then(setLive).catch(() => navigate('/'));
  }, [id, navigate]);

  const handleEnded = useCallback(() => {
    setEnded(true);
    if (viewersIntervalRef.current) { clearInterval(viewersIntervalRef.current); viewersIntervalRef.current = null; }
    if (statusIntervalRef.current) { clearInterval(statusIntervalRef.current); statusIntervalRef.current = null; }
  }, []);

  // Polling de viewer count
  useEffect(() => {
    if (!id || ended) return;
    const interval = setInterval(() => {
      liveService.obterViewers(id).then((d) => setViewers(d.total)).catch(() => {});
    }, 5000);
    viewersIntervalRef.current = interval;
    return () => { clearInterval(interval); viewersIntervalRef.current = null; };
  }, [id, ended]);

  // Polling de status como rede de segurança (web não tem SSE)
  useEffect(() => {
    if (!id || ended || live?.status !== 'ativa') return;
    const interval = setInterval(() => {
      liveService.obter(id).then((data) => {
        if (data.status !== 'ativa') handleEnded();
      }).catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          handleEnded();
        }
      });
    }, 10000);
    statusIntervalRef.current = interval;
    return () => { clearInterval(interval); statusIntervalRef.current = null; };
  }, [id, ended, live?.status, handleEnded]);

  if (ended) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <h1 className="text-xl font-bold mb-2">Live Encerrada</h1>
        <p className="text-neutral-500 mb-4">A transmissão terminou.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors">
          Voltar ao início
        </button>
      </div>
    );
  }

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

      {live && <LivePlayer live={live} onEnded={handleEnded} />}

      {live && (
        <div className="mt-4">
          <p className="text-sm text-neutral-500">Por {live.criador_nome}</p>
          {live.descricao && <p className="text-sm mt-1">{live.descricao}</p>}
        </div>
      )}
    </div>
  );
}
