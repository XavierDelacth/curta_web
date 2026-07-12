import { useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { BASE_URL } from '@/api/http-client';

export type WhipStatus = 'idle' | 'connecting' | 'live' | 'error';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function useWhipBroadcaster() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const liveIdRef = useRef<string>('');
  const locationRef = useRef<string>('');
  const [status, setStatus] = useState<WhipStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const iniciar = useCallback(async (liveId: string, stream: MediaStream) => {
    if (pcRef.current) return;

    setStatus('connecting');
    setError(null);
    liveIdRef.current = liveId;

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      setStatus('error');
      setError('Sessão expirada');
      return;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setStatus('error');
        setError('Ligação WebRTC perdida');
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
    setStatus('idle');
  }, []);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    liveIdRef.current = '';
    locationRef.current = '';
    setStatus('idle');
  }, []);

  return { status, error, iniciar, parar, cleanup };
}
