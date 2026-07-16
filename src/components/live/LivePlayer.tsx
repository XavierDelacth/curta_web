import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, AlertTriangle, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import { useWhepPlayer } from './useWhepPlayer';
import { LiveDetail } from '@/types';

interface LivePlayerProps {
  live: LiveDetail;
  onEnded?: () => void;
}

export default function LivePlayer({ live, onEnded }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const whepRef = useRef<ReturnType<typeof useWhepPlayer>>();
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionStateRef = useRef<'connected' | 'reconnecting' | 'failed'>('connected');
  const [useHls, setUseHls] = useState(false);
  const [muted, setMuted] = useState(true);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'failed'>('connected');
  const whep = useWhepPlayer();
  whepRef.current = whep;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const handleManualRetry = useCallback(() => {
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
    connectionStateRef.current = 'reconnecting';
    setConnectionState('reconnecting');
    if (hlsRef.current) hlsRef.current.startLoad();
  }, []);

  const initHls = useCallback((video: HTMLVideoElement, url: string) => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
    retryCountRef.current = 0;
    connectionStateRef.current = 'connected';
    setConnectionState('connected');
    video.srcObject = null;
    const hls = new Hls({ lowLatencyMode: true });
    hlsRef.current = hls;
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => { retryCountRef.current = 0; connectionStateRef.current = 'connected'; setConnectionState('connected'); video.play().catch(() => {}); });
    hls.on(Hls.Events.FRAG_LOADED, () => {
      if (connectionStateRef.current !== 'connected') {
        retryCountRef.current = 0;
        connectionStateRef.current = 'connected';
        setConnectionState('connected');
      }
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        if (data.response?.code === 404) {
          onEnded?.();
          return;
        }
        retryCountRef.current += 1;
        connectionStateRef.current = 'reconnecting';
        setConnectionState('reconnecting');
        if (retryCountRef.current > 8) {
          connectionStateRef.current = 'failed';
          setConnectionState('failed');
          return;
        }
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        const delay = Math.min(1000 * 2 ** (retryCountRef.current - 1), 15000);
        retryTimeoutRef.current = setTimeout(() => { retryTimeoutRef.current = null; hls.startLoad(); }, delay);
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        connectionStateRef.current = 'failed';
        setConnectionState('failed');
      }
    });
  }, [onEnded]);

  /** 1. Tentar WHEP (lives whip/rtmp passam pelo MediaMTX). */
  useEffect(() => {
    if (!videoRef.current || useHls) return;
    const video = videoRef.current;

    whep.play(live.id, video, () => {
      setUseHls(true);
    });

    return () => {
      whep.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.id]);

  /** 2. Fallback HLS (para source=browser, ou após timeout WHEP). */
  useEffect(() => {
    if (!useHls || !videoRef.current || !live.hls_url) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      initHls(video, live.hls_url);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = live.hls_url;
    }

    const handleOnline = () => {
      if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
      retryCountRef.current = 0;
      connectionStateRef.current = 'reconnecting';
      setConnectionState('reconnecting');
      if (hlsRef.current) hlsRef.current.startLoad();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
      window.removeEventListener('online', handleOnline);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [useHls, live.hls_url, initHls]);

  return (
    <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        muted
      />
      {connectionState === 'reconnecting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20 pointer-events-none">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <span className="text-white text-sm mt-3">Ligação perdida. A reconectar...</span>
        </div>
      )}
      {connectionState === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <AlertTriangle className="w-10 h-10 text-white" />
          <span className="text-white text-sm mt-3 mb-4">Não foi possível reconectar.</span>
          <button
            onClick={handleManualRetry}
            className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {muted && (
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          title="Ativar som"
        >
          <VolumeX className="w-4 h-4 text-white" />
        </button>
      )}
      {!muted && (
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors z-10"
          title="Silenciar"
        >
          <Volume2 className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  );
}
