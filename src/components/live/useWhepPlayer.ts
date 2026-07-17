import { useCallback, useRef } from 'react';
import { liveService } from '@/api/live-service';

const WHEP_TIMEOUT_MS = 5000;
/** O ICE passa por 'disconnected' em falhas curtas e recupera sozinho; só desistimos se persistir. */
const ICE_DISCONNECT_GRACE_MS = 4000;
const TURN_URL = import.meta.env.VITE_TURN_URL ?? 'turn:openrelay.metered.ca:80';
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME ?? 'openrelayproject';
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL ?? 'openrelayproject';
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
];

interface WhepHandlers {
  /** Chamado quando chega track remoto — a ligação está viva. */
  onConnected: () => void;
  /** Chamado quando a ligação falha, seja na negociação ou já a meio da emissão. */
  onFailure: () => void;
}

export function useWhepPlayer() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const graceRef = useRef<ReturnType<typeof setTimeout>>();
  const locRef = useRef<string>('');
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** Invalida callbacks de peer connections antigas depois de um cleanup. */
  const epochRef = useRef(0);

  const cleanup = useCallback(() => {
    epochRef.current += 1;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (graceRef.current) clearTimeout(graceRef.current);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    remoteStreamRef.current = null;
  }, []);

  const play = useCallback(async (
    liveId: string,
    video: HTMLVideoElement,
    { onConnected, onFailure }: WhepHandlers,
  ) => {
    cleanup();
    const epoch = epochRef.current;
    const stale = () => epoch !== epochRef.current;
    const fail = () => {
      if (stale()) return;
      cleanup();
      onFailure();
    };

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    videoRef.current = video;
    locRef.current = '';
    remoteStreamRef.current = null;

    /** Se passarem 5s sem track remoto → falha. */
    let gotTrack = false;
    pc.ontrack = (ev) => {
      if (stale()) return;
      gotTrack = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        video.srcObject = remoteStreamRef.current;
      }

      const alreadyHasTrack = remoteStreamRef.current
        .getTracks()
        .some((t) => t.id === ev.track.id);
      if (!alreadyHasTrack) {
        remoteStreamRef.current.addTrack(ev.track);
      }

      video.play().catch(() => {
        /* autoplay pode falhar antes de interação do utilizador */
      });
      onConnected();
    };

    pc.oniceconnectionstatechange = () => {
      if (stale()) return;
      const state = pc.iceConnectionState;

      if (state === 'failed') {
        fail();
        return;
      }
      if (state === 'disconnected') {
        if (graceRef.current) clearTimeout(graceRef.current);
        graceRef.current = setTimeout(() => {
          if (stale()) return;
          if (pcRef.current?.iceConnectionState === 'disconnected') fail();
        }, ICE_DISCONNECT_GRACE_MS);
        return;
      }
      if (state === 'connected' || state === 'completed') {
        if (graceRef.current) {
          clearTimeout(graceRef.current);
          graceRef.current = undefined;
        }
      }
    };

    timeoutRef.current = setTimeout(() => {
      if (!gotTrack) fail();
    }, WHEP_TIMEOUT_MS);

    try {
      const transceiver = pc.addTransceiver('video', { direction: 'recvonly' });
      transceiver.setCodecPreferences(
        RTCRtpReceiver.getCapabilities('video')?.codecs.filter(
          (c) => c.mimeType === 'video/H264' || c.mimeType === 'video/VP8' || c.mimeType === 'video/VP9',
        ) ?? [],
      );

      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      if (stale()) return;
      await pc.setLocalDescription(offer);
      if (!offer.sdp) throw new Error('SDP offer vazio');

      const { sdp: answerSdp, location } = await liveService.enviarOfertaWhep(liveId, offer.sdp);
      if (stale()) return;
      locRef.current = location;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch {
      fail();
    }
  }, [cleanup]);

  const terminate = useCallback(async (liveId: string) => {
    cleanup();
    try {
      await liveService.terminarWhep(liveId, locRef.current);
    } catch { /* ignore */ }
  }, [cleanup]);

  return { play, cleanup, terminate };
}
