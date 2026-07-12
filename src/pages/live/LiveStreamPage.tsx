import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Radio, StopCircle, Camera, CameraOff, AlertCircle } from 'lucide-react';
import { liveService } from '@/api/live-service';
import { LiveDetail } from '@/types';
import { useWhipBroadcaster } from '@/hooks/useWhipBroadcaster';

export default function LiveStreamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState<LiveDetail | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const whip = useWhipBroadcaster();

  useEffect(() => {
    if (!id) return;
    liveService.obter(id).then(setLive).catch(() => navigate('/'));
  }, [id, navigate]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraOn(true);
    } catch {}
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video?.srcObject) {
      video.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  const startStreaming = useCallback(async () => {
    if (!id || !streamRef.current) return;
    await whip.iniciar(id, streamRef.current);
  }, [id, whip]);

  const stopStreaming = useCallback(async () => {
    await whip.parar();
  }, [whip]);

  const handleEnd = useCallback(async () => {
    await whip.parar();
    if (id) {
      await liveService.terminar(id).catch(() => {});
    }
    stopCamera();
    navigate('/');
  }, [id, whip, stopCamera, navigate]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">Transmissão Live</h1>
        {whip.status === 'live' && <span className="flex items-center gap-1 text-sm text-red-500 font-semibold"><Radio className="w-4 h-4" /> A transmitir</span>}
        {whip.status === 'connecting' && <span className="flex items-center gap-1 text-sm text-yellow-500 font-semibold"><Radio className="w-4 h-4" /> A ligar...</span>}
      </div>
      <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {!cameraOn && (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Câmara desligada</p>
            </div>
          </div>
        )}
      </div>
      {whip.status === 'error' && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{whip.error ?? 'Erro na transmissão'}</span>
        </div>
      )}
      <div className="flex gap-3 mt-4">
        <button onClick={cameraOn ? stopCamera : startCamera}
          className={`flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 ${cameraOn ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-brand-red text-white'}`}>
          {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          {cameraOn ? 'Desligar Câmara' : 'Ligar Câmara'}
        </button>
        {cameraOn && whip.status === 'idle' && (
          <button onClick={startStreaming} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600">
            <Radio className="w-4 h-4" /> Iniciar
          </button>
        )}
        {whip.status === 'live' && (
          <button onClick={stopStreaming} className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-yellow-600">
            <StopCircle className="w-4 h-4" /> Parar
          </button>
        )}
        <button onClick={handleEnd} className="px-4 py-2.5 border border-red-300 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
          <StopCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
