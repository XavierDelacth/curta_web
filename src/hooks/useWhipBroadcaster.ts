import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { BASE_URL } from '@/api/http-client';

export type WhipStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'error';

// Em produção, usar um TURN próprio. Desenvolvimento: openrelay (gratuito).
const TURN_URL = import.meta.env.VITE_TURN_URL ?? 'turn:openrelay.metered.ca:80';
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME ?? 'openrelayproject';
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL ?? 'openrelayproject';
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
];
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWhipBroadcaster() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const liveIdRef = useRef<string>('');
  const locationRef = useRef<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<WhipStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const iniciar = useCallback(async (liveId: string, stream: MediaStream) => {
    if (pcRef.current && status !== 'reconnecting') return;

    setStatus('connecting');
    setError(null);
    liveIdRef.current = liveId;
    streamRef.current = stream;

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      setStatus('error');
      setError('Sessão expirada');
      return;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Adicionar tracks — usar addTransceiver para vídeo para poder
    // forçar H264 (único codec que o MediaMTX consegue remuxar para HLS)
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    if (videoTrack) {
      const transceiver = pc.addTransceiver(videoTrack, {
        direction: 'sendonly',
        streams: [stream],
      });
      const caps = RTCRtpSender.getCapabilities('video');
      if (caps) {
        const h264 = caps.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/h264');
        if (h264.length > 0) {
          transceiver.setCodecPreferences(h264);
        } else {
          console.warn('[WHIP] H264 não disponível — a publicar sem forçar codec');
        }
      }
    }
    if (audioTrack) {
      pc.addTrack(audioTrack, stream);
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          setStatus('reconnecting');
          const delay = Math.min(1000 * 2 ** reconnectCountRef.current, 15000);
          reconnectCountRef.current += 1;
          reconnectTimerRef.current = setTimeout(() => {
            if (pcRef.current) {
              pcRef.current.close();
              pcRef.current = null;
            }
            if (liveIdRef.current && streamRef.current) {
              iniciar(liveIdRef.current, streamRef.current);
            }
          }, delay);
        } else {
          setStatus('error');
          setError('Ligação WebRTC perdida');
        }
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Aguarda o ICE gathering concluir (sem trickle)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve();
          };
        }
      });

      if (!pc.localDescription?.sdp) throw new Error('SDP offer vazio');

      const resp = await fetch(`${BASE_URL}/live/${liveId}/whip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: pc.localDescription.sdp,
      });

      if (resp.status === 201) {
        const answerSdp = await resp.text();
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
        locationRef.current = resp.headers.get('Location') ?? '';
        reconnectCountRef.current = 0;
        setStatus('live');
      } else if (resp.status === 404) {
        setStatus('error');
        setError('Live não encontrada ou já terminada');
      } else if (resp.status === 403) {
        setStatus('error');
        setError('Não és o criador desta live');
      } else {
        const body = await resp.text().catch(() => '');
        setStatus('error');
        setError(`Erro WHIP (${resp.status}): ${body.slice(0, 200)}`);
      }
    } catch (err) {
      pc.close();
      pcRef.current = null;
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }, []);

  const parar = useCallback(async () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const pc = pcRef.current;
    if (pc) {
      pc.close();
      pcRef.current = null;
    }

    const lid = liveIdRef.current;
    if (lid) {
      try {
        const token = useAuthStore.getState().accessToken;
        await fetch(`${BASE_URL}/live/${lid}/whip`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }

    liveIdRef.current = '';
    locationRef.current = '';
    streamRef.current = null;
    reconnectCountRef.current = 0;
    setStatus('idle');
  }, []);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    liveIdRef.current = '';
    locationRef.current = '';
    streamRef.current = null;
    reconnectCountRef.current = 0;
    setStatus('idle');
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      if ((status === 'error' || status === 'reconnecting') && liveIdRef.current && streamRef.current) {
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        reconnectCountRef.current = 0;
        iniciar(liveIdRef.current, streamRef.current);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [status, iniciar]);

  return { status, error, iniciar, parar, cleanup };
}
