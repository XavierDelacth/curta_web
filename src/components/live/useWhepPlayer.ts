import { useCallback, useRef } from 'react';
import { liveService } from '@/api/live-service';

const WHEP_TIMEOUT_MS = 5000;
const TURN_URL = import.meta.env.VITE_TURN_URL ?? 'turn:openrelay.metered.ca:80';
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME ?? 'openrelayproject';
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL ?? 'openrelayproject';
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
];

export function useWhepPlayer() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const locRef = useRef<string>('');
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const play = useCallback(async (
    liveId: string,
    video: HTMLVideoElement,
    onFallback: () => void,
  ) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    videoRef.current = video;
    locRef.current = '';
    remoteStreamRef.current = null;

    /** Se passarem 5s sem track remoto → fallback HLS. */
    let gotTrack = false;
    pc.ontrack = (ev) => {
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
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        cleanup();
        onFallback();
      }
    };

    timeoutRef.current = setTimeout(() => {
      if (!gotTrack) {
        cleanup();
        onFallback();
      }
    }, WHEP_TIMEOUT_MS);

    try {
      const transceiver = pc.addTransceiver('video', { direction: 'recvonly' });
      transceiver.setCodecPreferences(
        RTCRtpReceiver.getCapabilities('video')?.codecs.filter(
          (c) => c.mimeType === 'video/H264' || c.mimeType === 'video/VP8' || c.mimeType === 'video/VP9',
        ) ?? [],
      );

      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      if (!offer.sdp) throw new Error('SDP offer vazio');

      const { sdp: answerSdp, location } = await liveService.enviarOfertaWhep(liveId, offer.sdp);
      locRef.current = location;
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch {
      cleanup();
      onFallback();
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

  const terminate = useCallback(async (liveId: string) => {
    cleanup();
    try {
      await liveService.terminarWhep(liveId, locRef.current);
    } catch { /* ignore */ }
  }, [cleanup]);

  return { play, cleanup, terminate };
}
