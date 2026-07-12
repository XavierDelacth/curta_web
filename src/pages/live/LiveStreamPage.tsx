import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Radio, StopCircle, Camera, CameraOff } from 'lucide-react';
import { liveService } from '@/api/live-service';
import { LiveDetail } from '@/types';

export default function LiveStreamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [live, setLive] = useState<LiveDetail | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    if (!id) return;
    liveService.obter(id).then(setLive).catch(() => navigate('/'));
  }, [id, navigate]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setCameraOn(true);
    } catch {}
  }, []);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  const startStreaming = useCallback(async () => {
    if (!id || !videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
    mediaRecorderRef.current = mr;
    mr.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const blob = new Blob([e.data], { type: 'video/webm' });
        liveService.pushChunk(id, blob).catch(() => {});
      }
    };
    mr.start(1000);
    setStreaming(true);
  }, [id]);

  const stopStreaming = useCallback(async () => {
    mediaRecorderRef.current?.stop();
    if (id) liveService.finishPush(id).catch(() => {});
    setStreaming(false);
  }, [id]);

  const handleEnd = useCallback(async () => {
    if (id) {
      await liveService.terminar(id).catch(() => {});
    }
    stopCamera();
    navigate('/');
  }, [id, stopCamera, navigate]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">Transmissão Live</h1>
        {streaming && <span className="flex items-center gap-1 text-sm text-red-500 font-semibold"><Radio className="w-4 h-4" /> A transmitir</span>}
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

      <div className="flex gap-3 mt-4">
        <button onClick={cameraOn ? stopCamera : startCamera}
          className={`flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 ${cameraOn ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-brand-red text-white'}`}>
          {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          {cameraOn ? 'Desligar Câmara' : 'Ligar Câmara'}
        </button>

        {cameraOn && !streaming && (
          <button onClick={startStreaming} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600">
            <Radio className="w-4 h-4" /> Iniciar
          </button>
        )}

        {streaming && (
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