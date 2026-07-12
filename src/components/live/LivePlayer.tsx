import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import Hls from 'hls.js';
import { useWhepPlayer } from './useWhepPlayer';
import { LiveDetail } from '@/types';

interface LivePlayerProps {
  live: LiveDetail;
}

export default function LivePlayer({ live }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const whepRef = useRef<ReturnType<typeof useWhepPlayer>>();
  const [useHls, setUseHls] = useState(false);
  const [muted, setMuted] = useState(true);
  const whep = useWhepPlayer();
  whepRef.current = whep;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

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
      hlsRef.current = new Hls({ lowLatencyMode: true });
      hlsRef.current.loadSource(live.hls_url);
      hlsRef.current.attachMedia(video);
      hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = live.hls_url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [useHls, live.hls_url]);

  return (
    <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        muted
      />
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
