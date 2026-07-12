import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { catalogService } from '@/api/catalog-service';
import { BASE_URL } from '@/api/http-client';
import { useAuthStore } from '@/stores/auth-store';
import { CurtaOut } from '@/types';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function FilmPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [film, setFilm] = useState<CurtaOut | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const resetHideTimer = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [resetHideTimer]);

  useEffect(() => {
    if (!id) return;
    catalogService.getFilm(id).then(setFilm).catch(() => {});
  }, [id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !id) return;

    const hlsUrl = `${BASE_URL}/streaming/${id}/master.m3u8`;
    const streamUrl = `${BASE_URL}/streaming/${id}/stream`;
    let hls: Hls | null = null;
    let fellBack = false;

    const fallbackToStream = () => {
      if (fellBack) return;
      fellBack = true;
      hls?.destroy();
      hlsRef.current = null;
      video.src = streamUrl;
      video.play().catch(() => {});
    };

    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, maxBufferLength: 4 });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (fellBack) return;
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            fallbackToStream();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls?.recoverMediaError();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    } else {
      video.src = streamUrl;
    }

    return () => { hls?.destroy(); hlsRef.current = null; };
  }, [id]);

  // Progress sync
  useEffect(() => {
    if (!user || !id) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.duration <= 0) return;
      const pct = Math.min(Math.round((v.currentTime / v.duration) * 100), 100);
      import('@/api/http-client').then(({ default: api }) => {
        api.put(`/streaming/${id}/progress`, { percentagem_assistida: pct, segundos_assistidos: Math.round(v.currentTime) }).catch(() => {});
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [user, id]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
    resetHideTimer();
  }, [resetHideTimer]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const v = videoRef.current;
    if (v && isFinite(pct)) { v.currentTime = pct * v.duration; resetHideTimer(); }
  }, [resetHideTimer]);

  const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = videoRef.current;
    if (v) { v.volume = pct; setVolume(pct); setIsMuted(pct === 0); resetHideTimer(); }
  }, [resetHideTimer]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" onMouseMove={resetHideTimer}>
      <video ref={videoRef} className="flex-1 w-full object-contain" playsInline autoPlay onTimeUpdate={(e) => { setCurrentTime(e.currentTarget.currentTime); setDuration(e.currentTarget.duration); }}
        onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)} onPlaying={() => setIsBuffering(false)} />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-red" />
        </div>
      )}

      {showControls && (
        <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none">
          {/* Top */}
          <div className="flex items-center gap-3 px-4 pt-4 pointer-events-auto">
            <button onClick={() => navigate(-1)} className="p-2 text-white hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-semibold text-sm truncate">{film?.titulo}</span>
          </div>

          {/* Centre play */}
          <div className="flex items-center justify-center pointer-events-auto">
            <button onClick={togglePlay} className="p-4 text-white hover:bg-white/10 rounded-full">
              {isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12 ml-1" fill="white" />}
            </button>
          </div>

          {/* Bottom */}
          <div className="px-4 pb-4 space-y-2 pointer-events-auto">
            <div className="flex items-center gap-2 text-white text-xs">
              <span className="w-10 text-right">{formatTime(currentTime)}</span>
              <div ref={progressRef} className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer group relative" onClick={handleProgressClick}>
                <div className="h-full bg-brand-red rounded-full relative" style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="w-10">{formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setIsMuted(!isMuted); } }} className="text-white">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-24 h-1.5 bg-white/30 rounded-full cursor-pointer" onClick={handleVolumeChange}>
                <div className="h-full bg-white rounded-full" style={{ width: `${isMuted ? 0 : volume * 100}%` }} />
              </div>
              <button onClick={() => videoRef.current?.requestFullscreen?.()} className="text-white ml-auto">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
